import { chromium } from 'playwright';
import * as fs from 'fs';

/**
 * Sniff Benefits API to capture the working payload
 */
async function sniffBenefits() {
  console.log('🕵️ Benefits API Sniffer\n');
  console.log('=' .repeat(60));
  
  const browser = await chromium.launch({ 
    headless: false,
    args: ['--window-size=1400,900']
  });
  
  const context = await browser.newContext({ 
    storageState: 'dot-storage.json',
    viewport: { width: 1400, height: 900 }
  });
  
  const page = await context.newPage();
  
  let benefitsPayload: any = null;
  let benefitsResponse: any = null;
  
  // Capture benefits API calls
  page.on('requestfinished', async request => {
    const url = request.url();
    
    if (url.includes('/api/dot-gateway/') && url.includes('benefit')) {
      const method = request.method();
      const endpoint = url.replace('https://www.dentalofficetoolkit.com', '');
      
      console.log(`\n📡 ${method} ${endpoint}`);
      
      try {
        const postData = request.postData();
        if (postData) {
          const payload = JSON.parse(postData);
          console.log('Request:', JSON.stringify(payload, null, 2));
          
          if (url.includes('memberbenefits')) {
            benefitsPayload = payload;
          }
        }
      } catch {}
      
      try {
        const response = await request.response();
        if (response && response.ok()) {
          const data = await response.json();
          console.log('✅ SUCCESS!');
          
          if (url.includes('memberbenefits')) {
            benefitsResponse = data;
            
            // Save working payload
            fs.writeFileSync('working-benefits-full.json', JSON.stringify({
              endpoint,
              method,
              payload: benefitsPayload,
              response: data
            }, null, 2));
            
            console.log('💾 Saved to working-benefits-full.json');
          }
        }
      } catch {}
    }
  });
  
  // Navigate to member search
  await page.goto('https://www.dentalofficetoolkit.com/dot-ui/member-search', {
    waitUntil: 'networkidle'
  });
  
  console.log('\n📋 INSTRUCTIONS:');
  console.log('=' .repeat(60));
  console.log('1️⃣  Search for Maurice Berend (916797559)');
  console.log('2️⃣  Click on the member result');
  console.log('3️⃣  Click "Member Details & Benefits"');
  console.log('4️⃣  Expand "Routine Procedures" or "Coverage"');
  console.log('5️⃣  Watch the console for captured API calls');
  console.log('=' .repeat(60));
  console.log('\n⏰ Browser will stay open for 2 minutes...\n');
  
  // Wait for manual navigation
  await page.waitForTimeout(2 * 60 * 1000);
  
  console.log('\n✅ Capture complete!');
  
  if (benefitsPayload) {
    console.log('\n🎯 Key fields from working payload:');
    console.log('clientId:', benefitsPayload.clientId);
    console.log('subClientId:', benefitsPayload.subClientId);
    console.log('benefitProgramOid:', benefitsPayload.benefitProgramOid);
  }
  
  await browser.close();
}

sniffBenefits().catch(console.error);