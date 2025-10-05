import { chromium } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables from parent directory
dotenv.config({ path: path.join(__dirname, '../../../.env') });

/**
 * Automated login to DOT - fully headless login with credentials
 * Handles the Okta authentication flow with its intermediate screens
 *
 * @param storagePath - Path to save the session state
 * @param headless - Whether to run in headless mode (default true for automation)
 * @param credentials - Optional credentials (for multi-clinic support)
 */
export async function autoLogin(
  storagePath = 'dot-storage.json',
  headless = true,
  credentials?: { username?: string; password?: string }
) {
  // Accept credentials from parameter (for multi-clinic support) or fallback to env vars
  const username = credentials?.username || process.env.DOT_USERNAME;
  const password = credentials?.password || process.env.DOT_PASSWORD;

  if (!username || !password) {
    throw new Error('DOT credentials missing: username and password are required');
  }
  
  console.log('🤖 Starting DOT automated login...');
  
  const browser = await chromium.launch({ 
    headless,
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
    
    // Step 2: Fill username and check "Keep me signed in"
    console.log('✏️  Filling username...');
    await page.fill('input[name="identifier"]', username);
    
    // Check "Keep me signed in" for longer session
    try {
      // Try clicking the label instead of the checkbox directly
      const rememberLabel = await page.locator('label:has-text("Keep me signed in")');
      if (await rememberLabel.isVisible()) {
        await rememberLabel.click();
        console.log('✅ Checked "Keep me signed in"');
      }
    } catch (e) {
      // Fallback: try the checkbox directly with force
      try {
        const rememberCheckbox = await page.locator('input[name="rememberMe"]');
        if (await rememberCheckbox.isVisible()) {
          await rememberCheckbox.check({ force: true });
          console.log('✅ Checked "Keep me signed in" (forced)');
        }
      } catch (e2) {
        console.log('⚠️  Could not check "Keep me signed in" - continuing anyway');
      }
    }
    
    // Click Next
    console.log('🔄 Clicking Next...');
    await page.click('input[value="Next"]');
    
    // Step 3: Wait for password screen (handle Okta transitions)
    console.log('⏳ Waiting for Okta authentication flow...');
    console.log('   (Multiple intermediate screens will appear - this is normal)');
    
    // Wait for the password screen - use multiple selectors as fallback
    try {
      await page.waitForSelector('text="Verify with your password"', { 
        timeout: 20000,
        state: 'visible' 
      });
      console.log('✅ Password verification screen detected');
    } catch (e) {
      // Fallback: wait for password input field directly
      console.log('   Waiting for password field...');
      await page.waitForSelector('input[name="credentials.passcode"]', { 
        timeout: 30000,
        state: 'visible'
      });
      console.log('✅ Password field detected');
    }
    
    // Small delay to ensure the page is fully loaded
    await page.waitForTimeout(1000);
    
    // Step 4: Fill password and submit
    console.log('🔐 Entering password...');
    const passwordField = await page.locator('input[name="credentials.passcode"]');
    await passwordField.fill(password);
    
    // Click Verify button
    console.log('🔄 Clicking Verify...');
    const verifyButton = await page.locator('input[value="Verify"]');
    await verifyButton.click();
    
    // Step 5: Wait for successful login (redirect to dashboard)
    console.log('⏳ Waiting for dashboard...');
    await page.waitForURL(/dot-ui\/(home|dashboard|search|member-benefits|member-detail)/, { 
      timeout: 60000 
    });
    
    console.log('✅ Login successful!');
    
    // Step 6: Save session
    console.log('💾 Saving session...');
    await context.storageState({ path: storagePath });
    
    // Step 7: Generate base64 for production (optional)
    const sessionData = fs.readFileSync(storagePath, 'utf-8');
    const sessionB64 = Buffer.from(sessionData).toString('base64');
    
    console.log(`✅ Session saved to ${storagePath}`);
    
    // Save base64 to file for production deployment
    fs.writeFileSync('dot-session-b64.txt', `DOT_SESSION_B64=${sessionB64}`);
    
    return { success: true, sessionPath: storagePath };
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('❌ Auto-login failed:', errorMessage);
    
    // Check for specific error types
    if (errorMessage.includes('timeout')) {
      console.log('💡 Possible causes:');
      console.log('   - Network issues or VPN not connected');
      console.log('   - Okta flow changed');
      console.log('   - Invalid credentials');
    }
    
    throw error;
  } finally {
    await browser.close();
  }
}

/**
 * Check if session is still valid by parsing expiration dates
 */
export function isSessionValid(storagePath = 'dot-storage.json'): boolean {
  if (!fs.existsSync(storagePath)) {
    return false;
  }
  
  try {
    const sessionData = JSON.parse(fs.readFileSync(storagePath, 'utf-8'));
    const now = Date.now() / 1000; // Current time in seconds
    
    // Check cookies expiration
    if (sessionData.cookies) {
      for (const cookie of sessionData.cookies) {
        if (cookie.expires && cookie.expires > 0) {
          // Add 30 minutes buffer before expiration
          const expiresWithBuffer = cookie.expires - (30 * 60);
          if (now > expiresWithBuffer) {
            console.log(`⚠️  Cookie ${cookie.name} expires soon or is expired`);
            return false;
          }
        }
      }
    }
    
    // Check file age as fallback (8 hours max as observed)
    const stats = fs.statSync(storagePath);
    const ageInHours = (Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60);
    if (ageInHours > 7) { // Re-auth 1 hour before expected expiry
      console.log(`⚠️  Session is ${ageInHours.toFixed(1)} hours old - needs refresh`);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error checking session validity:', error instanceof Error ? error.message : String(error));
    return false;
  }
}

/**
 * Ensure valid session - check and auto-login if needed
 *
 * @param storagePath - Path to the session state file
 * @param credentials - Optional credentials (for multi-clinic support)
 */
export async function ensureValidSession(
  storagePath = 'dot-storage.json',
  credentials?: { username?: string; password?: string }
): Promise<boolean> {
  // Check if session exists and is valid
  if (isSessionValid(storagePath)) {
    console.log('✅ Session is valid');
    return true;
  }

  // Accept credentials from parameter (for multi-clinic support) or fallback to env vars
  const username = credentials?.username || process.env.DOT_USERNAME;
  const password = credentials?.password || process.env.DOT_PASSWORD;

  if (!username || !password) {
    console.log('❌ No valid session and no credentials for auto-login');
    console.log('📝 Please run one of:');
    console.log('   cd dot-extractor && npm run login:assist  (assisted login)');
    console.log('   cd dot-extractor && npm run login         (manual login)');
    console.log('   OR set DOT_USERNAME and DOT_PASSWORD environment variables');
    return false;
  }
  
  // Perform auto-login
  console.log('🔄 Session invalid or expired - performing auto-login...');
  try {
    await autoLogin(storagePath, true, credentials); // Always headless for automation
    return true;
  } catch (error) {
    console.error('❌ Auto-login failed:', error instanceof Error ? error.message : String(error));
    console.log('💡 Falling back to manual/assisted login');
    console.log('   Run: cd dot-extractor && npm run login:assist');
    return false;
  }
}

// Run if called directly
if (require.main === module) {
  autoLogin('dot-storage.json', true)
    .then(() => {
      console.log('\n✅ Automated login completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Automated login failed:', error.message);
      process.exit(1);
    });
}