import { chromium } from 'playwright';

/**
 * Bootstrap Benefits payload by capturing a working request from the UI
 */
export async function bootstrapBenefitsPayload(storage = 'dot-storage.json'): Promise<any> {
  console.log('🔄 Bootstrapping Benefits payload from UI...');
  
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ storageState: storage });
  const page = await ctx.newPage();

  let workingPayload: any = null;
  let workingResponse: any = null;

  page.on('requestfinished', async request => {
    const url = request.url();
    if (url.includes('/api/dot-gateway/v1/benefit/memberbenefits/search')) {
      const res = await request.response();
      
      if (res && res.ok()) {
        try {
          const postData = request.postData();
          if (postData) {
            workingPayload = JSON.parse(postData);
            console.log('✅ Captured working Benefits payload');
            
            // Also capture the response to understand the structure
            try {
              workingResponse = await res.json();
            } catch {}
          }
        } catch (e) {
          console.log('⚠️  Could not parse Benefits payload');
        }
      }
    }
  });

  // Navigate to a page that triggers Benefits API
  try {
    // Try member-benefits page first
    await page.goto('https://www.dentalofficetoolkit.com/dot-ui/member-benefits', { 
      waitUntil: 'networkidle',
      timeout: 15000 
    });
  } catch {
    // Fallback: navigate to member search and trigger manually
    await page.goto('https://www.dentalofficetoolkit.com/dot-ui/member-search', {
      waitUntil: 'networkidle'
    });
  }

  // Wait for potential API calls
  await page.waitForTimeout(2000);
  
  await browser.close();

  if (!workingPayload) {
    throw new Error('Could not capture working Benefits payload - manual navigation needed');
  }

  // Save for debugging
  const fs = require('fs');
  fs.writeFileSync('bootstrapped-benefits.json', JSON.stringify({
    payload: workingPayload,
    response: workingResponse
  }, null, 2));
  
  console.log('💾 Saved to bootstrapped-benefits.json');
  
  return workingPayload;
}

/**
 * Retry Benefits with bootstrapped payload
 */
export async function getBenefitsWithBootstrap(
  api: any,
  personId: string,
  subscriberPersonId: string,
  dateOfBirthISO: string,
  relationship: 'Subscriber' | 'Spouse' | 'Dependent',
  originalPayload: any
): Promise<any> {
  // First try with original payload
  try {
    const response = await api.post('/api/dot-gateway/v1/benefit/memberbenefits/search', {
      data: originalPayload
    });
    
    if (response.ok()) {
      return await response.json();
    }
    
    // If 400/422, try bootstrap
    const errorText = await response.text();
    console.log('⚠️  Benefits failed, attempting bootstrap...');
    
  } catch (error) {
    console.log('⚠️  Benefits error, attempting bootstrap...');
  }
  
  // Bootstrap and retry
  try {
    const bootstrapped = await bootstrapBenefitsPayload();
    
    // Merge our data with bootstrapped structure
    const retryPayload = {
      ...bootstrapped,
      memberPersonId: personId,
      subscriberPersonId: subscriberPersonId,
      memberBirthDate: dateOfBirthISO.replace('Z', '-02:00'), // Keep timezone format
      relationshipToSubscriber: relationship
    };
    
    console.log('🔄 Retrying with bootstrapped payload...');
    
    const retryResponse = await api.post('/api/dot-gateway/v1/benefit/memberbenefits/search', {
      data: retryPayload
    });
    
    if (!retryResponse.ok()) {
      const retryError = await retryResponse.text();
      throw new Error(`Benefits retry failed: ${retryResponse.status()} - ${retryError}`);
    }
    
    console.log('✅ Benefits retrieved with bootstrap!');
    return await retryResponse.json();
    
  } catch (bootstrapError) {
    console.log('❌ Bootstrap failed:', bootstrapError);
    return null;
  }
}