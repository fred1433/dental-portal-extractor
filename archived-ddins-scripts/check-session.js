#!/usr/bin/env node
/* eslint-disable no-console */

/**
 * Quick session check for Delta Dental INS
 * Tests if the saved session is still valid by making a minimal API call
 */

const { request } = require('playwright');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const SESSION_PATH = process.env.DDINS_SESSION_PATH || path.join(__dirname, '..', '..', '.ddins-session', 'storageState.json');
const PT_USER_ID = process.env.DDINS_PT_USERID || 'Payoraccess4771';

async function checkSession() {
  // Check if session file exists
  if (!fs.existsSync(SESSION_PATH)) {
    console.log('❌ No session file found at:', SESSION_PATH);
    console.log('   Run: npm --prefix ddins-extractor run login:interactive');
    process.exit(1);
  }

  console.log('🔍 Checking DDINS session...');
  console.log('📁 Session file:', SESSION_PATH);
  console.log('👤 PT User ID:', PT_USER_ID);

  // Create API context with session
  const api = await request.newContext({
    baseURL: 'https://www.deltadentalins.com',
    storageState: SESSION_PATH,
    extraHTTPHeaders: {
      'accept': 'application/json',
      'content-type': 'application/json',
      'pt-userid': PT_USER_ID
    }
  });

  try {
    // Test with minimal roster call (pageSize=1)
    const res = await api.post('/provider-tools/v2/api/patient-mgnt/patient-roster', {
      data: {
        mtvPlocId: process.env.DDINS_PLOC || '107313380005',
        pageNumber: 1,
        pageSize: 1,
        patientView: 'PATIENTVIEW',
        sortBy: 'MODIFIED_DATE',
        contractType: 'FFS'
      }
    });

    const contentType = (res.headers()['content-type'] || '').toLowerCase();
    const text = await res.text();

    // Check if response is HTML (session expired)
    if (contentType.includes('text/html') || text.includes('<!DOCTYPE') || text.includes('<html')) {
      console.log('❌ Session expired (got HTML response)');
      console.log('   Run: npm --prefix ddins-extractor run login:interactive');
      await api.dispose();
      process.exit(1);
    }

    // Check if response is JSON and OK
    if (res.ok() && contentType.includes('json')) {
      try {
        const data = JSON.parse(text);
        console.log('✅ Session is valid');
        console.log(`   Found ${data.totalRecords || 0} patients`);
        await api.dispose();
        process.exit(0);
      } catch (e) {
        console.log('⚠️ Got response but couldn\'t parse JSON');
        await api.dispose();
        process.exit(1);
      }
    }

    // Other error
    console.log(`❌ Session check failed: ${res.status()}`);
    console.log('   Run: npm --prefix ddins-extractor run login:interactive');
    await api.dispose();
    process.exit(1);

  } catch (error) {
    console.log('❌ Session check error:', error.message);
    console.log('   Run: npm --prefix ddins-extractor run login:interactive');
    await api.dispose();
    process.exit(1);
  }
}

// Run the check
checkSession().catch(console.error);