import { chromium } from 'playwright';

async function testClaimDetail() {
  console.log('🔍 Testing claim detail API...\n');
  
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    storageState: 'dot-storage.json'
  });
  
  const page = await context.newPage();
  let bearerToken: string | null = null;
  
  // Capture Bearer token and API calls
  page.on('request', request => {
    const auth = request.headers()['authorization'];
    if (auth && auth.startsWith('Bearer ')) {
      bearerToken = auth.substring(7);
    }
    
    // Log claim detail API calls
    if (request.url().includes('/claim/') && request.url().includes('detail')) {
      console.log('📤 Claim Detail API:', request.method(), request.url());
      const postData = request.postData();
      if (postData) {
        try {
          console.log('Body:', JSON.stringify(JSON.parse(postData), null, 2));
        } catch {
          console.log('Body:', postData);
        }
      }
    }
  });
  
  page.on('response', async response => {
    if (response.url().includes('/claim/') && response.url().includes('detail')) {
      console.log('📥 Response:', response.status());
      if (response.ok()) {
        try {
          const data = await response.json();
          console.log('Data:', JSON.stringify(data, null, 2).substring(0, 1000));
        } catch {}
      }
    }
  });
  
  // Navigate to trigger token
  await page.goto('https://www.dentalofficetoolkit.com/dot-ui/home/', {
    waitUntil: 'networkidle'
  });
  
  if (!bearerToken) {
    throw new Error('Could not capture Bearer token');
  }
  
  console.log('✅ Captured Bearer token\n');
  
  // Try to get claim details using the claim ID from Maurice's data
  const claimId = 'NjAyREUxRUJFMTVERjIxQTlGQjE4QjkwMjlGODFDQUI4OTdEMjNFODdDM0VDNzFFNjI1RTFCOTNCNzQ4N0M=';
  
  console.log('📋 Attempting to fetch claim details...');
  console.log('Claim ID:', claimId);
  
  // Try different possible endpoints
  const endpoints = [
    `/api/dot-gateway/v1/claim/detail/${claimId}`,
    `/api/dot-gateway/v1/claim/${claimId}/detail`,
    `/api/dot-gateway/v1/claim/details`,
    `/api/dot-gateway/v2/claim/detail`
  ];
  
  for (const endpoint of endpoints) {
    console.log(`\n🔸 Trying: ${endpoint}`);
    
    try {
      // GET request
      const getResponse = await page.request.get(
        `https://www.dentalofficetoolkit.com${endpoint}`,
        {
          headers: {
            'Authorization': `Bearer ${bearerToken}`,
            'Accept': 'application/json'
          }
        }
      );
      
      console.log(`  GET Response: ${getResponse.status()}`);
      if (getResponse.ok()) {
        const data = await getResponse.json();
        console.log('  ✅ Success! Data:', JSON.stringify(data, null, 2).substring(0, 500));
        break;
      }
    } catch (error) {
      console.log(`  GET Error: ${error}`);
    }
    
    try {
      // POST request with claim ID
      const postResponse = await page.request.post(
        `https://www.dentalofficetoolkit.com${endpoint}`,
        {
          data: { claimId },
          headers: {
            'Authorization': `Bearer ${bearerToken}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        }
      );
      
      console.log(`  POST Response: ${postResponse.status()}`);
      if (postResponse.ok()) {
        const data = await postResponse.json();
        console.log('  ✅ Success! Data:', JSON.stringify(data, null, 2).substring(0, 500));
        break;
      }
    } catch (error) {
      console.log(`  POST Error: ${error}`);
    }
  }
  
  console.log('\n📍 Now navigating to claims page to capture real API calls...');
  console.log('Please navigate to a claim detail page manually\n');
  
  // Navigate to claims search
  await page.goto('https://www.dentalofficetoolkit.com/dot-ui/claims-search', {
    waitUntil: 'networkidle'
  });
  
  // Keep browser open for manual navigation
  console.log('Browser will stay open for 60 seconds...');
  console.log('Click on a claim to see the detail API call\n');
  
  await page.waitForTimeout(60000);
  await browser.close();
}

testClaimDetail().catch(console.error);