#!/usr/bin/env node

/**
 * DDINS Auto-Login Script
 * Automatically logs into Delta Dental Insurance and saves the session
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const STORAGE_PATH = process.env.DDINS_SESSION_PATH
  || path.join(__dirname, '..', '.ddins-session', 'storageState.json');

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
    headless: true, // Run in background
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
    await page.goto('https://www.deltadentalins.com/ciam/login?TARGET=%2Fprovider-tools%2Fv2', {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });

    // Enter username
    console.log('👤 Entering username...');
    await page.getByRole('textbox', { name: 'Username' }).click();
    await page.getByRole('textbox', { name: 'Username' }).fill(USERNAME);
    await page.getByRole('button', { name: 'Next' }).click();

    // Wait for password field
    await page.waitForTimeout(1500);

    // Enter password
    console.log('🔑 Entering password...');
    await page.getByRole('textbox', { name: 'Password' }).click();
    await page.getByRole('textbox', { name: 'Password' }).fill(PASSWORD);
    await page.getByRole('button', { name: 'Verify' }).click();

    // Wait for redirect to provider tools
    console.log('⏳ Waiting for login to complete...');
    await page.waitForURL('**/provider-tools/v2', { timeout: 30000 });

    // Extra wait to ensure session is fully established
    await page.waitForTimeout(3000);

    // Save the session
    await context.storageState({ path: STORAGE_PATH });
    console.log(`💾 Session saved → ${path.relative(process.cwd(), STORAGE_PATH)}`);

    // Extract pt-userid from localStorage
    try {
      const ptUserId = await page.evaluate(() => localStorage.getItem('pt-userid'));
      if (ptUserId) {
        console.log(`✅ Login successful! PT-UserID: ${ptUserId}`);
      } else {
        console.log('✅ Login successful!');
      }
    } catch (e) {
      console.log('✅ Login successful!');
    }

  } catch (error) {
    console.error('❌ Auto-login failed:', error.message);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

// Run the auto-login
autoLogin().catch(console.error);