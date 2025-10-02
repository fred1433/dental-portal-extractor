import { chromium } from 'playwright';

async function debugAPI() {
  console.log('🔍 Debugging API calls...\n');
  
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    storageState: 'dot-storage.json'
  });
  
  const page = await context.newPage();
  
  // Intercept API requests to see headers
  page.on('request', request => {
    if (request.url().includes('/api/dot-gateway/')) {
      console.log('📤 API Request:', request.method(), request.url());
      console.log('Headers:', request.headers());
      const postData = request.postData();
      if (postData) {
        try {
          console.log('Body:', JSON.stringify(JSON.parse(postData), null, 2));
        } catch {
          console.log('Body:', postData);
        }
      }
      console.log('---');
    }
  });
  
  page.on('response', response => {
    if (response.url().includes('/api/dot-gateway/')) {
      console.log('📥 API Response:', response.status(), response.url());
      console.log('---\n');
    }
  });
  
  try {
    // Navigate to member search
    console.log('🌐 Loading member search page...\n');
    await page.goto('https://www.dentalofficetoolkit.com/dot-ui/member-search', {
      waitUntil: 'networkidle'
    });
    
    // Fill search form
    console.log('📝 Filling search form...\n');
    
    // Try to find and fill the member ID field
    await page.waitForSelector('input[type="text"]', { timeout: 5000 });
    
    // Fill member ID
    const memberIdInput = page.locator('input[placeholder*="Member" i], input[name*="member" i]').first();
    if (await memberIdInput.count() > 0) {
      await memberIdInput.fill('916797559');
      console.log('✅ Filled member ID\n');
    }
    
    // Fill first name
    const firstNameInput = page.locator('input[placeholder*="First" i], input[name*="first" i]').first();
    if (await firstNameInput.count() > 0) {
      await firstNameInput.fill('Maurice');
      console.log('✅ Filled first name\n');
    }
    
    // Fill last name
    const lastNameInput = page.locator('input[placeholder*="Last" i], input[name*="last" i]').first();
    if (await lastNameInput.count() > 0) {
      await lastNameInput.fill('Berend');
      console.log('✅ Filled last name\n');
    }
    
    // Fill birth date
    const dobInput = page.locator('input[placeholder*="Birth" i], input[placeholder*="DOB" i], input[name*="birth" i], input[name*="dob" i]').first();
    if (await dobInput.count() > 0) {
      await dobInput.fill('12/16/1978');
      console.log('✅ Filled date of birth\n');
    }
    
    console.log('⏳ Waiting for you to click Search button...');
    console.log('👆 Please click the Search button in the browser\n');
    
    // Wait for API call
    await page.waitForResponse(response => 
      response.url().includes('/api/dot-gateway/') && 
      response.status() === 200,
      { timeout: 60000 }
    );
    
    console.log('✅ API call captured!\n');
    
    // Keep browser open for inspection
    console.log('Browser will stay open for 30 seconds for inspection...');
    await page.waitForTimeout(30000);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await browser.close();
  }
}

debugAPI();