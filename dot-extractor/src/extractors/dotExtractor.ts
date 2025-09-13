import { APIRequestContext } from 'playwright';
import { createDotApi, closeApi } from '../sdk/dotClient';

interface ExtractOptions {
  memberId?: string;
  firstName?: string;
  lastName?: string;
  birthDate?: string;
  fromDate?: string;
  toDate?: string;
  allFamily?: boolean;
}

interface Person {
  personId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  relationship?: string;
}

export class DotExtractor {
  private api: APIRequestContext | null = null;

  async initialize(storagePath = 'dot-storage.json') {
    console.log('🚀 Initializing DOT API client...');
    this.api = await createDotApi(storagePath);
    console.log('✅ API client ready\n');
  }

  async searchMember(options: ExtractOptions) {
    if (!this.api) throw new Error('API not initialized');
    
    console.log('🔍 Searching for member...');
    
    // API requires ALL fields to be present
    if (!options.memberId || !options.firstName || !options.lastName || !options.birthDate) {
      throw new Error('Member search requires memberId, firstName, lastName, and birthDate');
    }
    
    const searchPayload = {
      memberId: options.memberId,
      firstName: options.firstName,
      lastName: options.lastName,
      birthDate: options.birthDate,
      responseTypeIndicator: 'XML'
    };
    
    const response = await this.api.post('/api/dot-gateway/v02/memberdetail/search', {
      data: searchPayload
    });
    
    if (!response.ok()) {
      const errorText = await response.text();
      throw new Error(`Member search failed: ${response.status()} - ${errorText}`);
    }
    
    const data = await response.json();
    console.log('✅ Member found\n');
    return data;
  }

  async getMemberBenefits(searchData: any, personId: string, relationship = 'Subscriber') {
    if (!this.api) throw new Error('API not initialized');
    
    console.log(`📋 Fetching benefits for ${relationship}...`);
    
    // Extract data from search response
    const subscriber = searchData.subscribers?.[0];
    if (!subscriber) throw new Error('No subscriber found in search data');
    
    const clientInfo = subscriber.clientInformation;
    
    // Find the person's data
    let memberPersonId = personId;
    let memberDob = subscriber.dateOfBirth;
    
    if (relationship !== 'Subscriber') {
      const dependent = subscriber.dependents?.find((d: any) => d.personId === personId);
      if (dependent) {
        memberDob = dependent.dateOfBirth;
      }
    }
    
    // Convert date format MM/DD/YYYY to ISO
    const [month, day, year] = memberDob.split('/');
    const isoDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day)).toISOString();
    
    const benefitsPayload = {
      clientSpecifiedId: clientInfo.clientSpecifiedId,
      subClientSpecifiedId: clientInfo.subClientSpecifiedId,
      memberPersonId: memberPersonId,
      subscriberPersonId: subscriber.personId,
      memberDateOfBirth: isoDate,
      memberPlanAcronym: clientInfo.planAbbrev || clientInfo.adminPlan,
      relationshipToSubscriber: relationship
      // Note: NOT sending memberBenefitType as it causes errors
    };
    
    try {
      const response = await this.api.post('/api/dot-gateway/v1/benefit/memberbenefits/search', {
        data: benefitsPayload
      });
      
      if (!response.ok()) {
        const text = await response.text();
        console.log(`⚠️  Benefits failed for ${relationship}: ${text}`);
        return null;
      }
      
      const data = await response.json();
      console.log(`✅ Benefits retrieved for ${relationship}\n`);
      return data;
    } catch (error) {
      console.log(`⚠️  Could not get benefits for ${relationship}: ${error}\n`);
      return null;
    }
  }

  async getClaimDetail(claimId: string) {
    if (!this.api) throw new Error('API not initialized');
    
    try {
      const response = await this.api.get(`/api/dot-gateway/v1/claimdetail?claimId=${encodeURIComponent(claimId)}`);
      
      if (!response.ok()) {
        console.log(`⚠️  Claim detail failed for ${claimId}: ${response.status()}`);
        return null;
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.log(`⚠️  Error fetching claim detail: ${error}`);
      return null;
    }
  }

  async getClaimsForPerson(searchData: any, personId: string, fromDate?: string, toDate?: string) {
    if (!this.api) throw new Error('API not initialized');
    
    console.log(`📊 Fetching claims for person ${personId}...`);
    
    const subscriber = searchData.subscribers?.[0];
    if (!subscriber) throw new Error('No subscriber found');
    
    const from = fromDate || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const to = toDate || new Date().toISOString();
    
    const allClaims: any[] = [];
    let beginIndex = 0;
    const pageSize = 100;
    
    while (true) {
      const claimsPayload = {
        searchType: 'FC-AB',
        beginIndex,
        endIndex: beginIndex + pageSize,
        startDate: from,
        endDate: to,
        patientPersonId: [personId],
        subscriberPersonId: subscriber.personId,
        procedureCodes: [],
        areaofArch: [],
        toothCodes: [],
        carrierAcronym: ''
      };
      
      try {
        const response = await this.api.post('/api/dot-gateway/v1/claim/search', {
          data: claimsPayload
        });
        
        if (!response.ok()) {
          console.log(`⚠️  Claims request failed: ${response.status()}`);
          break;
        }
        
        const data = await response.json();
        const items = data.items || data.claims || [];
        
        allClaims.push(...items);
        console.log(`  Retrieved ${items.length} claims (total: ${allClaims.length})`);
        
        if (items.length < pageSize) break;
        beginIndex += pageSize;
        
      } catch (error) {
        console.log(`⚠️  Error fetching claims: ${error}`);
        break;
      }
    }
    
    // Fetch details for each claim to get CDT codes and amounts
    console.log(`🔍 Fetching details for ${allClaims.length} claims...`);
    for (let i = 0; i < allClaims.length; i++) {
      const claim = allClaims[i];
      if (claim.claimId) {
        const detail = await this.getClaimDetail(claim.claimId);
        if (detail) {
          allClaims[i] = { ...claim, detail };
          console.log(`  ✓ Claim ${i+1}/${allClaims.length}: ${detail.claimNumber || claim.claimNumber}`);
        }
      }
    }
    
    console.log(`✅ Total claims retrieved: ${allClaims.length}\n`);
    return allClaims;
  }

  async extractFullData(options: ExtractOptions) {
    // Search for member
    const searchData = await this.searchMember(options);
    
    const subscriber = searchData.subscribers?.[0];
    if (!subscriber) {
      throw new Error('No subscriber found');
    }
    
    const results: any = {
      searchData,
      subscriber: {
        info: subscriber,
        benefits: null,
        claims: []
      },
      dependents: [],
      extractedAt: new Date().toISOString()
    };
    
    // Get subscriber benefits
    results.subscriber.benefits = await this.getMemberBenefits(
      searchData, 
      subscriber.personId, 
      'Subscriber'
    );
    
    // Get subscriber claims
    results.subscriber.claims = await this.getClaimsForPerson(
      searchData,
      subscriber.personId,
      options.fromDate,
      options.toDate
    );
    
    // Process family if requested
    if (options.allFamily && subscriber.dependents) {
      console.log(`👨‍👩‍👧‍👦 Processing ${subscriber.dependents.length} family members...\n`);
      
      for (const dependent of subscriber.dependents) {
        const depData: any = {
          info: dependent,
          benefits: null,
          claims: []
        };
        
        // Get dependent benefits
        const relationship = dependent.relationshipToSubscriber || 'Dependent';
        depData.benefits = await this.getMemberBenefits(
          searchData,
          dependent.personId,
          relationship
        );
        
        // Get dependent claims
        depData.claims = await this.getClaimsForPerson(
          searchData,
          dependent.personId,
          options.fromDate,
          options.toDate
        );
        
        results.dependents.push(depData);
      }
    }
    
    // Summary
    const totalClaims = results.subscriber.claims.length + 
      results.dependents.reduce((sum: number, d: any) => sum + d.claims.length, 0);
    
    console.log('\n📊 Extraction Summary:');
    console.log('======================');
    console.log(`✅ Subscriber: ${subscriber.subscriberFirstName} ${subscriber.subscriberLastName}`);
    console.log(`✅ Member ID: ${subscriber.alternateId || subscriber.memberId}`);
    console.log(`✅ Family members: ${subscriber.dependents?.length || 0}`);
    console.log(`✅ Total claims: ${totalClaims}`);
    console.log(`✅ Benefits: ${results.subscriber.benefits ? 'Retrieved' : 'Not available'}`);
    
    return results;
  }

  async close() {
    if (this.api) {
      await closeApi(this.api);
      console.log('🔒 API client closed');
    }
  }
}

// Export convenience function
export async function extractDotData(options: ExtractOptions) {
  const extractor = new DotExtractor();
  
  try {
    await extractor.initialize();
    const data = await extractor.extractFullData(options);
    return data;
  } finally {
    await extractor.close();
  }
}