#!/usr/bin/env node
/* eslint-disable no-console */

/**
 * Automated login script for Delta Dental INS
 * Uses Playwright to automatically fill in credentials and save session
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const STORAGE_PATH = path.join(process.cwd(), '..', '.ddins-session', 'storageState.json');
const START_URL = 'https://www.deltadentalins.com/provider-tools/v2';

// Ensure session directory exists
const sessionDir = path.dirname(STORAGE_PATH);
if (!fs.existsSync(sessionDir)) {
  fs.mkdirSync(sessionDir, { recursive: true });
}

async function autoLogin() {
  const username = process.env.DDINS_USERNAME;
  const password = process.env.DDINS_PASSWORD;
  
  if (!username || !password) {
    console.error('❌ Missing DDINS_USERNAME or DDINS_PASSWORD in environment');
    console.error('   Please set these in your .env file');
    process.exit(1);
  }

  console.log('🦷 Delta Dental INS - Automated Login');
  console.log('=====================================');
  console.log('');
  console.log('👤 Username:', username);
  console.log('🔑 Password:', '***' + password.slice(-2));
  console.log('');
  console.log('🌐 Opening browser...');
  
  const browser = await chromium.launch({ 
    headless: true // utiliser le binaire Chromium Playwright; pas besoin de Chrome système
  });
  
  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 },
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });
  
  const page = await context.newPage();
  
  // Capture PT User ID from requests
  let capturedPtUserId = null;
  page.on('request', (request) => {
    const headers = request.headers();
    if (headers['pt-userid'] && !capturedPtUserId) {
      capturedPtUserId = headers['pt-userid'];
      console.log(`📋 Captured PT User ID: ${capturedPtUserId}`);
    }
  });
  
  try {
    console.log(`📍 Navigating to ${START_URL}`);
    await page.goto(START_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    
    // Wait for redirect to login page with longer timeout
    await page.waitForURL('**/ciam/login**', { timeout: 60000 });
    console.log('🔐 Login page detected');
    
    // Step 1: Enter username
    console.log('📝 Entering username...');
    await page.getByRole('textbox', { name: 'Username' }).fill(username);
    
    // Step 2: Click Next
    await page.getByRole('button', { name: 'Next' }).click();
    
    // Wait for password field to appear
    await page.waitForSelector('[aria-label="Password"], input[type="password"]', { timeout: 5000 });
    
    // Step 3: Enter password
    console.log('🔒 Entering password...');
    await page.getByRole('textbox', { name: 'Password' }).fill(password);
    
    // Step 4: Click Verify
    await page.getByRole('button', { name: 'Verify' }).click();
    
    // Wait for MFA or successful login
    console.log('⏳ Waiting for authentication...');
    console.log('   (This may take a few seconds while Okta processes the login)');
    
    // Wait for navigation away from login page OR error message OR MFA (délais plus larges)
    let result = 'unknown';
    try {
      await Promise.race([
        // Wait for successful redirect to provider tools
        page.waitForURL('**/provider-tools/**', { timeout: 45000 }).then(() => { result = 'success'; }),
        // Wait for MFA code input
        page.waitForSelector('input[name="code"], input[aria-label*="code"]', { timeout: 45000 }).then(() => { result = 'mfa'; }),
        // Wait for error message
        page.waitForSelector('text=/Invalid/i, text=/incorrect/i', { timeout: 45000 }).then(() => { result = 'error'; })
      ]);
    } catch (timeoutError) {
      // If all promises timeout, check current state
      console.log('⏳ Still waiting... checking current state');
      await page.waitForTimeout(2000);
      
      const currentUrl = page.url();
      console.log('📍 Current URL:', currentUrl);
      
      // Final checks
      if (currentUrl.includes('/provider-tools/') || currentUrl.includes('deltadentalins.com/provider')) {
        result = 'success';
      } else if (await page.locator('input[name="code"], input[aria-label*="code"]').isVisible().catch(() => false)) {
        result = 'mfa';
      } else if (await page.locator('text=/Invalid/i, text=/incorrect/i').isVisible().catch(() => false)) {
        result = 'error';
      } else if (currentUrl.includes('/ciam/login')) {
        // Still on login, give it one more chance
        await page.waitForTimeout(3000);
        if (page.url().includes('/provider-tools/') || page.url().includes('deltadentalins.com/provider')) {
          result = 'success';
        } else {
          result = 'timeout';
        }
      } else {
        // We're somewhere else, probably success
        result = 'success';
      }
    }
    
    if (result === 'mfa') {
      console.log('');
      console.log('⚠️ MFA Required!');
      console.log('   This account requires multi-factor authentication.');
      console.log('   Please use the interactive login (npm run login:interactive) for MFA accounts.');
      await browser.close();
      process.exit(1);
    }
    
    if (result === 'error') {
      console.log('');
      console.log('❌ Login failed - Invalid credentials');
      console.log('   Please check your DDINS_USERNAME and DDINS_PASSWORD in .env');
      await browser.close();
      process.exit(1);
    }
    
    if (result === 'timeout') {
      console.log('');
      console.log('⏱️ Login timeout - Page did not respond as expected');
      await browser.close();
      process.exit(1);
    }
    
    // Success - we're logged in
    console.log('✅ Login successful!');
    
    // Handle PT User ID prompt if it appears
    await page.waitForTimeout(2000);
    const ptUserInput = await page.locator('input[name="ptUserId"], input[placeholder*="PT User"]').first();
    if (await ptUserInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      const ptUserId = process.env.DDINS_PT_USERID || username;
      console.log(`📝 Entering PT User ID: ${ptUserId}`);
      await ptUserInput.fill(ptUserId);
      
      const submitBtn = await page.locator('button:has-text("Submit"), button:has-text("Continue"), button[type="submit"]').first();
      if (await submitBtn.isVisible()) {
        await submitBtn.click();
        console.log('   ✓ PT User ID submitted');
        await page.waitForTimeout(2000);
      }
    }
    
    // Save the session
    console.log('');
    console.log('💾 Saving session...');
    await context.storageState({ path: STORAGE_PATH });
    console.log(`   ✓ Session saved to ${path.relative(process.cwd(), STORAGE_PATH)}`);
    
    // Save PT User ID if captured and not already in env
    if (capturedPtUserId && !process.env.DDINS_PT_USERID) {
      console.log('');
      console.log(`📋 PT User ID captured: ${capturedPtUserId}`);
      console.log('   Consider adding to .env file:');
      console.log(`   DDINS_PT_USERID=${capturedPtUserId}`);
    }
    
    console.log('');
    console.log('🎉 Automated login complete!');
    console.log('   Session saved and ready for extraction');
    
    await browser.close();
    process.exit(0);
    
  } catch (error) {
    console.log('');
    console.log('❌ Login failed:', error.message);
    await browser.close();
    process.exit(1);
  }
}

// Run the login
autoLogin().catch(console.error);