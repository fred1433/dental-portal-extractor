import { APIRequestContext } from 'playwright';
import { createDotApi, closeApi } from '../sdk/dotClient';
import { buildBenefitsPayload, flattenClaimDetail } from '../util/buildPayloads';
import { getBenefitProgramOid } from '../util/getBenefitProgramOid';
import { parseBenefits, generateBenefitsSummary } from '../util/benefitsParser';
import { ensureValidSession } from '../auth/autoLogin';

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
  private storagePath: string = 'dot-storage.json';

  async initialize(storagePath = 'dot-storage.json') {
    this.storagePath = storagePath;
    
    // Ensure session is valid before initializing API
    const sessionValid = await ensureValidSession(storagePath);
    if (!sessionValid) {
      throw new Error('Failed to establish valid DOT session');
    }
    
    console.log('🚀 Initializing DOT API client...');
    this.api = await createDotApi(storagePath);
    console.log('✅ API client ready\n');
  }
  
  private async reinitializeOnAuthError() {
    console.log('🔄 Session expired - attempting to re-authenticate...');
    
    // Close existing API connection
    if (this.api) {
      await closeApi(this.api);
      this.api = null;
    }
    
    // Try to auto-login
    const sessionValid = await ensureValidSession(this.storagePath);
    if (!sessionValid) {
      throw new Error('Failed to re-authenticate. Manual login required.');
    }
    
    // Reinitialize API with new session
    this.api = await createDotApi(this.storagePath);
    console.log('✅ Re-authentication successful\n');
  }

  async searchMember(options: ExtractOptions, retryCount = 0): Promise<any> {
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
    
    // Handle authentication errors with retry
    if (response.status() === 401 || response.status() === 403) {
      if (retryCount === 0) {
        console.log('⚠️  Authentication error detected - attempting to re-authenticate...');
        await this.reinitializeOnAuthError();
        return this.searchMember(options, 1); // Retry once
      } else {
        throw new Error(`Authentication failed after retry: ${response.status()}`);
      }
    }
    
    if (!response.ok()) {
      const errorText = await response.text();
      throw new Error(`Member search failed: ${response.status()} - ${errorText}`);
    }
    
    const data = await response.json();
    console.log('✅ Member found\n');
    return data;
  }

  async getMemberBenefits(searchData: any, personId: string, relationship: 'Subscriber' | 'Spouse' | 'Dependent' = 'Subscriber') {
    if (!this.api) throw new Error('API not initialized');
    
    console.log(`📋 Fetching benefits for ${relationship}...`);
    
    // Extract data from search response
    const subscriber = searchData.subscribers?.[0];
    if (!subscriber) throw new Error('No subscriber found in search data');
    
    const clientInfo = subscriber.clientInformation;
    
    // Find the person's data
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
    
    // Get benefitProgramOid - this is the KEY that was missing!
    let benefitProgramOid = subscriber.benefitProgramOid || clientInfo.benefitProgramOid;
    if (!benefitProgramOid) {
      // Try to fetch it from client search
      benefitProgramOid = await getBenefitProgramOid(
        this.api,
        clientInfo.planAbbrev || clientInfo.adminPlan || 'DDMN',
        clientInfo.clientSpecifiedId,  // Note: client search uses specifiedId
        clientInfo.subClientSpecifiedId || '0001'
      );
    }
    
    // Build payload with BOTH variants for retry logic
    const { variantA, variantB } = buildBenefitsPayload({
      clientId: clientInfo.clientId,  // Try with actual clientId first
      subClientId: clientInfo.subClientId,
      clientSpecifiedId: clientInfo.clientSpecifiedId,  // Fallback option
      subClientSpecifiedId: clientInfo.subClientSpecifiedId || '0001',
      benefitProgramOid: benefitProgramOid,  // This was missing!
      memberPersonId: personId,
      subscriberPersonId: subscriber.personId,
      memberDOBISO: isoDate,
      planAcronym: clientInfo.planAbbrev || clientInfo.adminPlan || 'DDMN',
      relationship: relationship,
      isEHBRequest: false,  // From successful captures
      isStandardRequest: false
    });
    
    try {
      // Try variant A first (with clientId/subClientId)
      let response = variantA ? await this.api.post('/api/dot-gateway/v1/benefit/memberbenefits/search', {
        data: variantA
      }) : null;
      
      // If variant A failed or didn't exist, try variant B
      if (!response || response.status() === 400) {
        if (response) {
          const errorA = await response.text();
          console.log(`⚠️  Variant A failed, trying variant B...`);
        }
        
        if (variantB) {
          response = await this.api.post('/api/dot-gateway/v1/benefit/memberbenefits/search', {
            data: variantB
          });
        }
      }
      
      if (!response || !response.ok()) {
        const text = response ? await response.text() : 'No response';
        console.log(`⚠️  Benefits failed for ${relationship}: ${text}`);
        return null;
      }
      
      const data = await response.json();
      console.log(`✅ Benefits retrieved for ${relationship}!`);
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
    
    // Fetch details concurrently with max 5 parallel requests
    console.log(`🔍 Fetching details for ${allClaims.length} claims...`);
    const BATCH_SIZE = 5;
    
    for (let i = 0; i < allClaims.length; i += BATCH_SIZE) {
      const batch = allClaims.slice(i, Math.min(i + BATCH_SIZE, allClaims.length));
      const detailPromises = batch.map(async (claim, idx) => {
        if (claim.claimId) {
          // Add small jitter to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, (idx * 100) + Math.random() * 200));
          const detail = await this.getClaimDetail(claim.claimId);
          if (detail) {
            const globalIdx = i + idx;
            console.log(`  ✓ Claim ${globalIdx + 1}/${allClaims.length}: ${detail.claimNumber || claim.claimNumber}`);
            return { ...claim, detail };
          }
        }
        return claim;
      });
      
      const batchResults = await Promise.all(detailPromises);
      batchResults.forEach((result, idx) => {
        allClaims[i + idx] = result;
      });
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
        benefitsParsed: null,
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
    
    // Parse benefits into structured format
    if (results.subscriber.benefits) {
      results.subscriber.benefitsParsed = parseBenefits(results.subscriber.benefits);
    }
    
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
          benefitsParsed: null,
          claims: []
        };
        
        // Get dependent benefits
        const relationship = dependent.relationshipToSubscriber || 'Dependent';
        depData.benefits = await this.getMemberBenefits(
          searchData,
          dependent.personId,
          relationship
        );
        
        // Parse benefits
        if (depData.benefits) {
          depData.benefitsParsed = parseBenefits(depData.benefits);
        }
        
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
    console.log(`✅ Benefits: ${results.subscriber.benefits ? 'Retrieved & Parsed' : 'Not available'}`);
    
    // Show benefits summary if available
    if (results.subscriber.benefitsParsed) {
      console.log('\n📋 Benefits Summary:');
      console.log('-------------------');
      const parsed = results.subscriber.benefitsParsed;
      console.log(`  • ${parsed.coverages.length} coverage categories`);
      console.log(`  • ${parsed.maximumsAndDeductibles.length} maximums/deductibles`);
      console.log(`  • ${parsed.networks.length} networks`);
      if (parsed.ortho.lifetimeMax > 0) {
        console.log(`  • Ortho lifetime max: $${parsed.ortho.lifetimeMax}`);
      }
    }
    
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
export async function extractDotData(options: ExtractOptions & { storagePath?: string }) {
  const extractor = new DotExtractor();
  
  try {
    await extractor.initialize(options.storagePath || 'dot-storage.json');
    const data = await extractor.extractFullData(options);
    return data;
  } finally {
    await extractor.close();
  }
}