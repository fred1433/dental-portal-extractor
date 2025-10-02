import { chromium } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Assisted login to DOT - pre-fills username and optionally password
 * Handles the Okta authentication flow with its intermediate screens
 * 
 * @param storagePath - Path to save the session state
 * @param headless - Whether to run in headless mode (false for assisted login)
 */
export async function assistedLogin(storagePath = 'dot-storage.json', headless = false) {
  console.log('🚀 Starting DOT assisted login...');
  
  const username = process.env.DOT_USERNAME;
  const password = process.env.DOT_PASSWORD;
  const isProduction = process.env.NODE_ENV === 'production';
  
  if (!username) {
    console.log('⚠️  DOT_USERNAME not found in environment variables');
    console.log('   You will need to enter it manually');
  }
  
  if (password && isProduction) {
    console.log('⚠️  Warning: DOT_PASSWORD should not be used in production');
    console.log('   Ignoring password for security reasons');
  }
  
  const browser = await chromium.launch({ 
    headless,
    slowMo: 100, // Add human-like delays
    args: ['--disable-blink-features=AutomationControlled']
  });
  
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });
  
  const page = await context.newPage();
  
  try {
    // Step 1: Navigate to login page
    console.log('📍 Navigating to DOT login page...');
    await page.goto('https://www.dentalofficetoolkit.com/dot-ui/login', {
      waitUntil: 'networkidle',
      timeout: 30000
    });
    
    // Step 2: Fill username if available
    const usernameField = await page.locator('input[name="identifier"]');
    if (await usernameField.isVisible()) {
      if (username) {
        console.log('✏️  Pre-filling username...');
        await usernameField.fill(username);
      } else {
        console.log('⏸️  Please enter your username');
        await usernameField.focus();
      }
      
      // Check "Keep me signed in"
      const rememberCheckbox = await page.locator('input[name="rememberMe"]');
      if (await rememberCheckbox.isVisible()) {
        await rememberCheckbox.check();
        console.log('✅ Checked "Keep me signed in"');
      }
      
      // Wait for user to fill username if not provided
      if (!username) {
        console.log('   Waiting for you to enter username and click Next...');
        await page.waitForURL(/(?!.*\/login$).*/, { timeout: 120000 });
      } else {
        // Click Next
        console.log('🔄 Clicking Next...');
        await page.click('input[value="Next"]');
      }
    }
    
    // Step 3: Wait for password screen (handle Okta transitions)
    console.log('⏳ Waiting for Okta authentication flow (this may take 15-20 seconds)...');
    console.log('   Multiple screens may appear - this is normal');
    
    // Wait for either the password field or "Verify with your password" text
    await Promise.race([
      page.waitForSelector('input[name="credentials.passcode"]', { timeout: 30000 }),
      page.waitForSelector('text="Verify with your password"', { timeout: 30000 }),
      page.waitForURL('**/ciam/login', { timeout: 30000 })
    ]);
    
    console.log('✅ Password screen detected');
    
    // Step 4: Handle password
    const passwordField = await page.locator('input[name="credentials.passcode"]');
    
    // Wait for field to be ready (sometimes there's a delay)
    await passwordField.waitFor({ state: 'visible', timeout: 10000 });
    await page.waitForTimeout(500); // Small delay for stability
    
    if (password && !isProduction) {
      console.log('✏️  Filling password...');
      await passwordField.fill(password);
      
      // Click Verify button
      const verifyButton = await page.locator('input[value="Verify"]');
      await verifyButton.click();
      console.log('🔐 Password submitted');
    } else {
      console.log('⏸️  Please enter your password manually');
      await passwordField.focus();
      console.log('   Waiting for you to enter password and click Verify...');
    }
    
    // Step 5: Wait for successful login
    console.log('⏳ Waiting for dashboard...');
    await page.waitForURL(/dot-ui\/(home|dashboard|search|member-benefits|member-detail)/, { 
      timeout: 60000 
    });
    
    console.log('✅ Login successful!');
    
    // Step 6: Save session
    console.log('💾 Saving session...');
    await context.storageState({ path: storagePath });
    
    // Step 7: Generate base64 for production
    const sessionData = fs.readFileSync(storagePath, 'utf-8');
    const sessionB64 = Buffer.from(sessionData).toString('base64');
    
    console.log(`\n✅ Session saved to ${storagePath}`);
    console.log('\n📋 For production deployment (Render), copy this environment variable:');
    console.log('━'.repeat(80));
    console.log(`DOT_SESSION_B64=${sessionB64.substring(0, 50)}...`);
    console.log('━'.repeat(80));
    console.log('\n💡 Full base64 has been saved to: dot-session-b64.txt');
    
    // Save full base64 to file for easy copying
    fs.writeFileSync('dot-session-b64.txt', `DOT_SESSION_B64=${sessionB64}`);
    
    console.log('\n✨ You can now run extraction commands without logging in again');
    
  } catch (error) {
    console.error('\n❌ Login failed:', error instanceof Error ? error.message : String(error));
    console.log('\n💡 Troubleshooting tips:');
    console.log('   1. Check your VPN is connected to US');
    console.log('   2. Verify DOT_USERNAME is correct');
    console.log('   3. Try running with headless=false to see what happens');
    console.log('   4. Use "npm run login" for fully manual login');
    throw error;
  } finally {
    await browser.close();
  }
}

// Run if called directly
if (require.main === module) {
  // Parse command line arguments
  const args = process.argv.slice(2);
  const headless = !args.includes('--headed');
  
  assistedLogin('dot-storage.json', headless)
    .then(() => {
      console.log('\n✅ Assisted login completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Assisted login failed:', error.message);
      console.log('\n💡 Falling back to manual login...');
      console.log('   Run: npm run login');
      process.exit(1);
    });
}