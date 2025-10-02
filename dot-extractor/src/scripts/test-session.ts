import { chromium } from 'playwright';

async function testSession() {
  console.log('🔍 Testing saved session...');
  
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    storageState: 'dot-storage.json'
  });
  
  const page = await context.newPage();
  
  try {
    console.log('📄 Loading DOT home page...');
    await page.goto('https://www.dentalofficetoolkit.com/dot-ui/home/', {
      waitUntil: 'networkidle'
    });
    
    // Check if we're still logged in
    const url = page.url();
    console.log(`Current URL: ${url}`);
    
    if (url.includes('/login')) {
      console.log('❌ Session expired - redirected to login');
      return false;
    }
    
    if (url.includes('/home') || url.includes('/dashboard')) {
      console.log('✅ Session is valid - logged in successfully!');
      
      // Try to navigate to member search
      console.log('🔍 Navigating to member search...');
      await page.goto('https://www.dentalofficetoolkit.com/dot-ui/member-search', {
        waitUntil: 'networkidle'
      });
      
      console.log('✅ Member search page loaded');
      
      // Keep browser open for 5 seconds to verify
      await page.waitForTimeout(5000);
      
      return true;
    }
    
  } catch (error) {
    console.error('❌ Error testing session:', error);
    return false;
  } finally {
    await browser.close();
  }
}

testSession().then(success => {
  if (success) {
    console.log('\n✨ Session test passed! You can use extraction.');
  } else {
    console.log('\n⚠️  Session test failed. Please run login again.');
  }
  process.exit(success ? 0 : 1);
});