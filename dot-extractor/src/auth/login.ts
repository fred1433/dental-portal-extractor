import { chromium } from 'playwright';
import * as path from 'path';

/**
 * Interactive login to DOT with session storage
 * Session will be saved to dot-storage.json for reuse
 */
export async function interactiveLogin(storagePath = 'dot-storage.json') {
  console.log('🔐 Starting DOT interactive login...');
  console.log('📝 Please log in manually (including MFA if required)');
  
  const browser = await chromium.launch({ 
    headless: false,
    args: ['--disable-blink-features=AutomationControlled']
  });
  
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });
  
  const page = await context.newPage();
  
  try {
    await page.goto('https://www.dentalofficetoolkit.com/dot-ui/login', {
      waitUntil: 'networkidle'
    });
    
    console.log('⏳ Waiting for successful login (max 3 minutes)...');
    console.log('   Navigate will complete when you reach dashboard/search/member-benefits');
    
    // Wait for redirect to main app after successful login
    await page.waitForURL(/dot-ui\/(home|dashboard|search|member-benefits|member-detail)/, { 
      timeout: 180_000 // 3 minutes
    });
    
    console.log('✅ Login successful! Saving session...');
    
    // Save authentication state
    await context.storageState({ path: storagePath });
    
    console.log(`💾 Session saved to ${storagePath}`);
    console.log('✨ You can now run extraction commands without logging in again');
    
  } catch (error) {
    console.error('❌ Login failed or timed out:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

// Run if called directly
if (require.main === module) {
  interactiveLogin()
    .then(() => {
      console.log('✅ Login process completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Login process failed:', error);
      process.exit(1);
    });
}