import { chromium, Browser, BrowserContext, Page } from 'playwright';
import * as fs from 'node:fs';
import * as path from 'node:path';

interface ExtractOptions {
  memberId?: string;
  firstName?: string;
  lastName?: string;
  birthDate?: string;
  headless?: boolean;
}

class DotBrowserExtractor {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private bearerToken: string | null = null;

  async initialize(storagePath = 'dot-storage.json', headless = true) {
    console.log('🚀 Initializing browser...');
    
    this.browser = await chromium.launch({ 
      headless,
      args: ['--disable-blink-features=AutomationControlled']
    });
    
    this.context = await this.browser.newContext({
      storageState: storagePath,
      viewport: { width: 1280, height: 720 }
    });
    
    this.page = await this.context.newPage();
    
    // Intercept requests to capture Bearer token
    this.page.on('request', request => {
      const auth = request.headers()['authorization'];
      if (auth && auth.startsWith('Bearer ')) {
        this.bearerToken = auth.substring(7);
        console.log('✅ Captured Bearer token');
      }
    });
    
    // Navigate to trigger token generation
    await this.page.goto('https://www.dentalofficetoolkit.com/dot-ui/home/', {
      waitUntil: 'networkidle'
    });
    
    // Verify we're logged in
    const url = this.page.url();
    if (url.includes('/login')) {
      throw new Error('Session expired - please run login again');
    }
    
    console.log('✅ Browser initialized and logged in');
  }

  async searchMember(options: ExtractOptions) {
    if (!this.page || !this.bearerToken) {
      throw new Error('Browser not initialized');
    }
    
    console.log('🔍 Searching for member...');
    
    // Use the captured Bearer token to make API call
    const searchPayload = {
      memberId: options.memberId || '',
      firstName: options.firstName || '',
      lastName: options.lastName || '',
      birthDate: options.birthDate || '',
      responseTypeIndicator: 'XML'
    };
    
    const response = await this.page.request.post(
      'https://www.dentalofficetoolkit.com/api/dot-gateway/v02/memberdetail/search',
      {
        data: searchPayload,
        headers: {
          'Authorization': `Bearer ${this.bearerToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      }
    );
    
    if (!response.ok()) {
      const text = await response.text();
      throw new Error(`Search failed: ${response.status()} - ${text}`);
    }
    
    const data = await response.json();
    console.log('✅ Member found');
    return data;
  }

  async getMemberBenefits(memberData: any) {
    if (!this.page || !this.bearerToken) {
      throw new Error('Browser not initialized');
    }
    
    console.log('📋 Fetching benefits...');
    
    // Extract IDs from member data
    const subscriberPersonId = memberData?.subscriberPersonId || 
                             memberData?.data?.subscriber?.personId;
    const memberPersonId = memberData?.memberPersonId || 
                         memberData?.data?.member?.personId;
    const planAcronym = memberData?.memberPlanAcronym || 
                       memberData?.data?.planAcronym || 'DDMN';
    
    const benefitsPayload = {
      clientSpecifiedId: memberData?.clientSpecifiedId || '051054',
      subClientSpecifiedId: memberData?.subClientSpecifiedId || '0001',
      memberPersonId,
      subscriberPersonId,
      memberDateOfBirth: new Date(memberData.birthDate || '1978-12-16').toISOString(),
      memberPlanAcronym: planAcronym,
      relationshipToSubscriber: 'Subscriber'
    };
    
    const response = await this.page.request.post(
      'https://www.dentalofficetoolkit.com/api/dot-gateway/v1/benefit/memberbenefits/search',
      {
        data: benefitsPayload,
        headers: {
          'Authorization': `Bearer ${this.bearerToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      }
    );
    
    if (!response.ok()) {
      const text = await response.text();
      throw new Error(`Benefits failed: ${response.status()} - ${text}`);
    }
    
    const data = await response.json();
    console.log('✅ Benefits retrieved');
    return data;
  }

  async getClaims(memberData: any, fromDate?: string, toDate?: string) {
    if (!this.page || !this.bearerToken) {
      throw new Error('Browser not initialized');
    }
    
    console.log('📊 Fetching claims...');
    
    const subscriberPersonId = memberData?.subscriberPersonId || 
                             memberData?.data?.subscriber?.personId;
    const memberPersonId = memberData?.memberPersonId || 
                         memberData?.data?.member?.personId;
    
    const claimsPayload = {
      searchType: 'FC-AB',
      beginIndex: 0,
      endIndex: 100,
      startDate: fromDate || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
      endDate: toDate || new Date().toISOString(),
      patientPersonId: [memberPersonId],
      subscriberPersonId,
      procedureCodes: [],
      areaofArch: [],
      toothCodes: [],
      carrierAcronym: ''
    };
    
    const response = await this.page.request.post(
      'https://www.dentalofficetoolkit.com/api/dot-gateway/v1/claim/search',
      {
        data: claimsPayload,
        headers: {
          'Authorization': `Bearer ${this.bearerToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      }
    );
    
    if (!response.ok()) {
      const text = await response.text();
      throw new Error(`Claims failed: ${response.status()} - ${text}`);
    }
    
    const data = await response.json();
    console.log(`✅ Retrieved ${data?.items?.length || 0} claims`);
    return data;
  }

  async extract(options: ExtractOptions) {
    console.log('\n📦 Starting extraction process...\n');
    
    const memberData = await this.searchMember(options);
    const benefits = await this.getMemberBenefits(memberData);
    const claims = await this.getClaims(memberData);
    
    const bundle = {
      input: options,
      memberData,
      benefits,
      claims,
      extractedAt: new Date().toISOString()
    };
    
    // Save results
    const outputDir = 'out';
    fs.mkdirSync(outputDir, { recursive: true });
    
    const filename = `extraction-${options.memberId || options.lastName}-${Date.now()}.json`;
    const filepath = path.join(outputDir, filename);
    
    fs.writeFileSync(filepath, JSON.stringify(bundle, null, 2));
    console.log(`\n💾 Results saved to: ${filepath}`);
    
    return bundle;
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      console.log('🔒 Browser closed');
    }
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const getArg = (name: string) => {
    const index = args.indexOf(`--${name}`);
    return index > -1 && args[index + 1] ? args[index + 1] : undefined;
  };
  
  const options: ExtractOptions = {
    memberId: getArg('memberId'),
    firstName: getArg('firstName'),
    lastName: getArg('lastName'),
    birthDate: getArg('birthDate'),
    headless: !args.includes('--headed')
  };
  
  if (!options.memberId && !(options.firstName && options.lastName && options.birthDate)) {
    console.error('Usage: ts-node extract-browser.ts --memberId 916797559 OR --firstName Maurice --lastName Berend --birthDate 12/16/1978');
    process.exit(1);
  }
  
  const extractor = new DotBrowserExtractor();
  
  try {
    await extractor.initialize('dot-storage.json', options.headless);
    const results = await extractor.extract(options);
    
    console.log('\n✨ Extraction completed successfully!');
    console.log(`📊 Summary:`);
    console.log(`  - Member found: ${results.memberData ? 'Yes' : 'No'}`);
    console.log(`  - Benefits retrieved: ${results.benefits ? 'Yes' : 'No'}`);
    console.log(`  - Claims found: ${results.claims?.items?.length || 0}`);
    
  } catch (error) {
    console.error('❌ Extraction failed:', error);
    process.exit(1);
  } finally {
    await extractor.close();
  }
}

if (require.main === module) {
  main();
}