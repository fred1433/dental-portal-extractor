#!/usr/bin/env node

/**
 * DDINS Auto-Login Script (Fixed version with Codegen)
 * Automatically logs into Delta Dental Insurance and saves the session
 * Now handles "Remember me" checkbox and MFA "Maybe Later" button
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const STORAGE_PATH = process.env.DDINS_SESSION_PATH
  || path.join(__dirname, '.ddins-session', 'storageState.json');

// Ensure session directory exists
const sessionDir = path.dirname(STORAGE_PATH);
if (!fs.existsSync(sessionDir)) {
  fs.mkdirSync(sessionDir, { recursive: true });
}

const USERNAME = process.env.DDINS_USERNAME;
const PASSWORD = process.env.DDINS_PASSWORD;

if (!USERNAME || !PASSWORD) {
  console.error('❌ DDINS_USERNAME and DDINS_PASSWORD environment variables are required');
  process.exit(1);
}

async function autoLogin() {
  console.log('🦷 DDINS Auto-Login Starting...');

  const browser = await chromium.launch({
    headless: true, // Production mode
    args: ['--disable-blink-features=AutomationControlled']
  });

  try {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });

    const page = await context.newPage();

    // Navigate to login page
    console.log('📍 Navigating to login page...');
    await page.goto('https://www.deltadentalins.com/ciam/login?TARGET=%2Fprovider-tools%2Fv2');

    // Enter username
    console.log('👤 Entering username...');
    await page.getByRole('textbox', { name: 'Username' }).click();
    await page.getByRole('textbox', { name: 'Username' }).fill(USERNAME);

    // Check "Remember me" checkbox - CRITICAL for longer sessions
    console.log('☑️  Checking "Remember me" checkbox...');
    // Click on the text label, which should check the checkbox
    await page.getByText('Remember me (providers only)').click();

    // Verify the checkbox is actually checked
    const isChecked = await page.locator('input[name="rememberMe"]').isChecked();
    if (!isChecked) {
      console.log('⚠️  Checkbox not checked, trying direct click...');
      await page.locator('input[name="rememberMe"]').check();
    }

    // Click Next
    await page.getByRole('button', { name: 'Next' }).click();

    // Enter password
    console.log('🔑 Entering password...');
    await page.getByRole('textbox', { name: 'Password' }).click();
    await page.getByRole('textbox', { name: 'Password' }).fill(PASSWORD);

    // Click Verify
    await page.getByRole('button', { name: 'Verify' }).click();

    // Handle MFA enrollment page if it appears
    console.log('⏳ Waiting for login to complete...');
    try {
      // Wait for either MFA page or direct provider tools
      await page.waitForURL(/\/(ciam\/authorize\/mfa|provider-tools)/, { timeout: 10000 });

      // If we're on MFA page, click "Maybe Later"
      if (page.url().includes('mfa')) {
        console.log('📱 MFA enrollment page detected, clicking "Maybe Later"...');
        await page.getByRole('button', { name: 'Maybe Later' }).click();
      }
    } catch (e) {
      // Continue anyway - we might already be on provider tools
    }

    // Final navigation to ensure we're on provider tools
    await page.goto('https://www.deltadentalins.com/provider-tools/v2');
    console.log('✅ Successfully reached provider tools');

    // Extra wait to ensure session is fully established
    console.log('⏳ Waiting for session to stabilize...');
    await page.waitForTimeout(5000);

    // CRITICAL: Save the session (cookies + localStorage)
    await context.storageState({ path: STORAGE_PATH });
    console.log(`💾 Session saved → ${path.relative(process.cwd(), STORAGE_PATH)}`);

    // Double-check we have the critical cookies
    const cookies = await context.cookies();
    const sessionCookies = cookies.filter(c =>
      c.name.includes('session') || c.name.includes('okta') || c.name === 'pt_session'
    );
    console.log(`   📦 Saved ${cookies.length} cookies (${sessionCookies.length} session-related)`);

    // CRITICAL: Extract pt-userid from localStorage for API calls
    try {
      const ptUserId = await page.evaluate(() => localStorage.getItem('pt-userid'));
      if (ptUserId) {
        console.log(`✅ Login successful! PT-UserID: ${ptUserId}`);

        // Optionally save to .env if not already there
        if (!process.env.DDINS_PT_USERID) {
          console.log(`💡 Add to .env: DDINS_PT_USERID=${ptUserId}`);
        }
      } else {
        console.log('✅ Login successful!');
      }
    } catch (e) {
      console.log('✅ Login successful!');
    }

  } catch (error) {
    console.error('❌ Auto-login failed:', error.message);

    // Suggest interactive login as fallback
    if (error.message.includes('Timeout')) {
      console.error('💡 Try interactive login: node ddins/interactive-login.js');
    }

    process.exit(1);
  } finally {
    await browser.close();
  }
}

// Run the auto-login
autoLogin().catch(console.error);
