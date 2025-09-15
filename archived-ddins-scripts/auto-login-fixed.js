#!/usr/bin/env node

const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const username = process.env.DDINS_USERNAME;
const password = process.env.DDINS_PASSWORD;

if (!username || !password) {
  console.error('❌ Missing DDINS_USERNAME or DDINS_PASSWORD in .env file');
  process.exit(1);
}

const SESSION_PATH = path.join(__dirname, '..', '..', '.ddins-session', 'storageState.json');
const SESSION_DIR = path.dirname(SESSION_PATH);

// Ensure session directory exists
if (!fs.existsSync(SESSION_DIR)) {
  fs.mkdirSync(SESSION_DIR, { recursive: true });
}

async function autoLogin() {
  console.log('🦷 Delta Dental INS - Fixed Auto Login');
  console.log('=======================================');
  console.log('');
  console.log('👤 Username:', username);
  console.log('🔑 Password:', '***' + password.slice(-2));
  console.log('');
  console.log('🌐 Opening browser...');
  
  const browser = await chromium.launch({ 
    headless: true // utiliser le binaire Chromium Playwright
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
    // Go directly to login page
    const LOGIN_URL = 'https://www.deltadentalins.com/ciam/login';
    console.log(`📍 Navigating directly to login page: ${LOGIN_URL}`);
    
    await page.goto(LOGIN_URL, { 
      waitUntil: 'networkidle',
      timeout: 60000 
    });
    
    console.log('🔐 Login page loaded');
    
    // Wait a bit for page to be fully ready
    await page.waitForTimeout(2000);
    
    // Try multiple selectors for username field
    console.log('📝 Entering credentials...');
    
    const usernameSelectors = [
      'input[name="username"]',
      'input[name="Username"]',
      'input[id="username"]',
      'input[type="text"]',
      'input[placeholder*="Username"]',
      'input[aria-label*="Username"]'
    ];
    
    let usernameField = null;
    for (const selector of usernameSelectors) {
      try {
        usernameField = await page.waitForSelector(selector, { timeout: 5000 });
        if (usernameField) {
          console.log(`   ✓ Found username field with selector: ${selector}`);
          break;
        }
      } catch (e) {
        // Try next selector
      }
    }
    
    if (!usernameField) {
      throw new Error('Could not find username field');
    }
    
    await usernameField.fill(username);
    console.log('   ✓ Username entered');
    
    // Try multiple selectors for password field
    const passwordSelectors = [
      'input[name="password"]',
      'input[name="Password"]',
      'input[id="password"]',
      'input[type="password"]',
      'input[placeholder*="Password"]',
      'input[aria-label*="Password"]'
    ];
    
    let passwordField = null;
    for (const selector of passwordSelectors) {
      try {
        passwordField = await page.waitForSelector(selector, { timeout: 5000 });
        if (passwordField) {
          console.log(`   ✓ Found password field with selector: ${selector}`);
          break;
        }
      } catch (e) {
        // Try next selector
      }
    }
    
    if (!passwordField) {
      throw new Error('Could not find password field');
    }
    
    await passwordField.fill(password);
    console.log('   ✓ Password entered');
    
    // Try multiple selectors for submit button
    const submitSelectors = [
      'button[type="submit"]',
      'button:has-text("Sign In")',
      'button:has-text("Login")',
      'button:has-text("Log In")',
      'input[type="submit"]',
      'button.btn-primary'
    ];
    
    let submitButton = null;
    for (const selector of submitSelectors) {
      try {
        submitButton = await page.waitForSelector(selector, { timeout: 5000 });
        if (submitButton) {
          console.log(`   ✓ Found submit button with selector: ${selector}`);
          break;
        }
      } catch (e) {
        // Try next selector
      }
    }
    
    if (!submitButton) {
      throw new Error('Could not find submit button');
    }
    
    console.log('🚀 Submitting login form...');
    await submitButton.click();
    
    console.log('⏳ Waiting for authentication...');
    console.log('   (This may take a few seconds while Okta processes the login)');
    
    // Wait for navigation with generous timeout
    try {
      await page.waitForURL('**/provider-tools/**', { timeout: 60000 });
      console.log('');
      console.log('✅ Login successful!');
      console.log('   Landed on:', page.url());
    } catch (e) {
      // Check if MFA is required
      const mfaField = await page.$('input[name="code"], input[aria-label*="code"]');
      if (mfaField) {
        console.log('');
        console.log('🔐 MFA Required!');
        console.log('   This account requires multi-factor authentication.');
        console.log('   Please use the interactive login: npm run login:interactive');
        await browser.close();
        process.exit(1);
      }
      
      // Check for error message
      const errorText = await page.textContent('body');
      if (errorText.toLowerCase().includes('invalid') || errorText.toLowerCase().includes('incorrect')) {
        console.log('');
        console.log('❌ Login failed - Invalid credentials');
        await browser.close();
        process.exit(1);
      }
      
      console.log('');
      console.log('⚠️ Login may have succeeded but navigation timed out');
      console.log('   Current URL:', page.url());
    }
    
    // Save session
    console.log('💾 Saving session...');
    const storageState = await context.storageState();
    
    // If we captured a PT User ID, ensure it's in localStorage
    if (capturedPtUserId) {
      const origins = storageState.origins || [];
      const ddinsOrigin = origins.find(o => o.origin === 'https://www.deltadentalins.com');
      if (ddinsOrigin) {
        ddinsOrigin.localStorage = ddinsOrigin.localStorage || [];
        const ptUserIdItem = ddinsOrigin.localStorage.find(item => item.name === 'pt-userid');
        if (!ptUserIdItem) {
          ddinsOrigin.localStorage.push({
            name: 'pt-userid',
            value: capturedPtUserId
          });
          console.log(`   ✓ Added PT User ID to session: ${capturedPtUserId}`);
        }
      }
    }
    
    fs.writeFileSync(SESSION_PATH, JSON.stringify(storageState, null, 2));
    console.log(`   ✓ Session saved to: ${SESSION_PATH}`);
    console.log('');
    console.log('🎉 Auto-login complete!');
    console.log('   You can now run extractions using this session.');
    
  } catch (error) {
    console.error('');
    console.error('❌ Auto-login failed:', error.message);
    console.error('');
    console.error('💡 Tips:');
    console.error('   1. Verify your credentials in .env file');
    console.error('   2. Try the interactive login: npm run login:interactive');
    console.error('   3. The site may have changed - manual login might be required');
    await browser.close();
    process.exit(1);
  }
  
  await browser.close();
}

autoLogin().catch(console.error);