#!/usr/bin/env node
/* eslint-disable no-console */

/**
 * Combined login + extraction script for Delta Dental INS
 * Keeps browser context alive during entire extraction process
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const START_URL = 'https://www.deltadentalins.com/provider-tools/v2';

async function autoLoginAndExtract() {
  const username = process.env.DDINS_USERNAME;
  const password = process.env.DDINS_PASSWORD;
  const ptUserId = process.env.DDINS_PT_USERID || username;
  const practiceLocationId = process.env.DDINS_PLOC || '107313380005';
  const maxPatients = process.env.MAX_PATIENTS ? parseInt(process.env.MAX_PATIENTS) : 10;
  
  if (!username || !password) {
    console.error('❌ Missing DDINS_USERNAME or DDINS_PASSWORD in environment');
    console.error('   Please set these in your .env file');
    process.exit(1);
  }

  console.log('🦷 Delta Dental INS - Automated Login & Extraction');
  console.log('==================================================');
  console.log('');
  console.log('👤 Username:', username);
  console.log('🔑 Password:', '***' + password.slice(-2));
  console.log('📋 PT User ID:', ptUserId);
  console.log('📍 Location ID:', practiceLocationId);
  console.log('🔢 Max patients:', maxPatients);
  console.log('');
  
  const browser = await chromium.launch({ 
    headless: false, // Show browser for debugging
    channel: 'chrome'
  });
  
  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 },
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });
  
  const page = await context.newPage();
  
  try {
    // ============ LOGIN PHASE ============
    console.log('📍 Phase 1: Authentication');
    console.log('   Navigating to login page...');
    await page.goto(START_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    
    // Wait for redirect to login page
    await page.waitForURL('**/ciam/login**', { timeout: 10000 });
    console.log('   ✓ Login page detected');
    
    // Enter credentials
    console.log('   Entering credentials...');
    await page.getByRole('textbox', { name: 'Username' }).fill(username);
    await page.getByRole('button', { name: 'Next' }).click();
    await page.waitForSelector('[aria-label="Password"], input[type="password"]', { timeout: 5000 });
    await page.getByRole('textbox', { name: 'Password' }).fill(password);
    await page.getByRole('button', { name: 'Verify' }).click();
    
    // Wait for successful login
    console.log('   Waiting for authentication...');
    console.log('   (This may take a few seconds while Okta processes the login)');
    
    let loginResult = 'unknown';
    try {
      await Promise.race([
        page.waitForURL('**/provider-tools/**', { timeout: 10000 }).then(() => { loginResult = 'success'; }),
        page.waitForSelector('input[name="code"], input[aria-label*="code"]', { timeout: 10000 }).then(() => { loginResult = 'mfa'; }),
        page.waitForSelector('text=/Invalid/i, text=/incorrect/i', { timeout: 10000 }).then(() => { loginResult = 'error'; })
      ]);
    } catch (timeoutError) {
      // If all promises timeout, check current state
      console.log('   Still waiting... checking current state');
      await page.waitForTimeout(2000);
      
      const currentUrl = page.url();
      console.log('   Current URL:', currentUrl);
      
      if (currentUrl.includes('/provider-tools/') || currentUrl.includes('deltadentalins.com/provider')) {
        loginResult = 'success';
      } else {
        await page.waitForTimeout(3000);
        if (page.url().includes('/provider-tools/') || page.url().includes('deltadentalins.com/provider')) {
          loginResult = 'success';
        }
      }
    }
    
    if (loginResult === 'mfa') {
      console.error('   ❌ MFA Required - Cannot automate');
      await browser.close();
      process.exit(1);
    }
    
    if (loginResult === 'error') {
      console.error('   ❌ Invalid credentials');
      await browser.close();
      process.exit(1);
    }
    
    if (loginResult !== 'success') {
      throw new Error('Login failed - timeout waiting for redirect');
    }
    
    console.log('   ✅ Login successful!');
    
    // Wait for page to fully load
    console.log('   Waiting for page to fully load...');
    await page.waitForTimeout(5000);
    
    // Handle PT User ID prompt if it appears
    const ptUserInput = await page.locator('input[name="ptUserId"], input[placeholder*="PT User"]').first();
    if (await ptUserInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log(`   Entering PT User ID: ${ptUserId}`);
      await ptUserInput.fill(ptUserId);
      const submitBtn = await page.locator('button:has-text("Submit"), button:has-text("Continue"), button[type="submit"]').first();
      if (await submitBtn.isVisible()) {
        await submitBtn.click();
        console.log('   ✓ PT User ID submitted');
        await page.waitForTimeout(2000);
      }
    }
    
    // ============ EXTRACTION PHASE ============
    console.log('');
    console.log('📍 Phase 2: Data Extraction');
    
    // Create API context from the browser context (reuses auth)
    const cookies = await context.cookies();
    const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ');
    
    // Get roster
    console.log('   Fetching patient roster...');
    const rosterResponse = await page.evaluate(async ({ ptUserId, practiceLocationId }) => {
      const response = await fetch('https://www.deltadentalins.com/provider-tools/v2/api/patient-roster/advanced-search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'pt-userid': ptUserId
        },
        body: JSON.stringify({
          pageNumber: 1,
          pageSize: 15
        })
      });
      
      if (!response.ok) {
        throw new Error(`Roster fetch failed: ${response.status}`);
      }
      
      return await response.json();
    }, { ptUserId, practiceLocationId });
    
    const patients = rosterResponse.patientDetails || [];
    const totalPatients = Math.min(patients.length, maxPatients);
    console.log(`   ✓ Found ${patients.length} patients, processing ${totalPatients}`);
    
    // Create output directory
    const outDir = path.join(__dirname, '..', 'out');
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }
    
    // Process each patient
    for (let i = 0; i < totalPatients; i++) {
      const patient = patients[i];
      const enrolleeId = patient.enrolleeId || patient.e1;
      
      console.log(`   [${i + 1}/${totalPatients}] Processing ${patient.firstName} ${patient.lastName} (${enrolleeId})`);
      
      // Fetch patient data using page.evaluate to maintain session
      const patientData = await page.evaluate(async ({ enrolleeId, ptUserId }) => {
        const results = {};
        
        // Fetch eligibility
        try {
          const eligResponse = await fetch(`https://www.deltadentalins.com/provider-tools/v2/api/eligibility/patient/${enrolleeId}`, {
            headers: {
              'Accept': 'application/json',
              'pt-userid': ptUserId
            }
          });
          results.eligibility = eligResponse.ok ? await eligResponse.json() : null;
        } catch (e) {
          results.eligibility = null;
        }
        
        // Fetch claims
        try {
          const claimsResponse = await fetch('https://www.deltadentalins.com/provider-tools/v2/api/claim/search', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'pt-userid': ptUserId
            },
            body: JSON.stringify({
              searchTerm: enrolleeId,
              pageNumber: 1,
              pageSize: 10
            })
          });
          results.claims = claimsResponse.ok ? await claimsResponse.json() : null;
        } catch (e) {
          results.claims = null;
        }
        
        return results;
      }, { enrolleeId, ptUserId });
      
      // Save patient data
      const patientFile = path.join(outDir, `patient_${enrolleeId}.json`);
      fs.writeFileSync(patientFile, JSON.stringify({
        patient,
        ...patientData,
        extractedAt: new Date().toISOString()
      }, null, 2));
      
      console.log(`      ✓ Saved to patient_${enrolleeId}.json`);
    }
    
    console.log('');
    console.log('✅ Extraction complete!');
    console.log(`   Processed ${totalPatients} patients`);
    console.log(`   Data saved to: ${outDir}`);
    
    await browser.close();
    process.exit(0);
    
  } catch (error) {
    console.log('');
    console.log('❌ Error:', error.message);
    await browser.close();
    process.exit(1);
  }
}

// Run the combined script
autoLoginAndExtract().catch(console.error);