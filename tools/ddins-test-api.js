#!/usr/bin/env node
/* eslint-disable no-console */
const { request } = require('playwright');
const path = require('path');
require('dotenv').config();

(async () => {
  const storage = process.env.DDINS_SESSION_PATH || path.join(__dirname, '..', '.ddins-session', 'storageState.json');
  const pt = process.env.DDINS_PT_USERID || '';
  
  console.log('🧪 DDINS API Test');
  console.log('  storageState:', storage);
  console.log('  pt-userid:', pt || '(empty)');
  console.log('');
  
  const api = await request.newContext({
    baseURL: 'https://www.deltadentalins.com',
    storageState: storage,
    extraHTTPHeaders: { 
      'accept': 'application/json, text/plain, */*',
      'content-type': 'application/json',
      'pt-userid': pt,
      'referer': 'https://www.deltadentalins.com/provider-tools/v2/eligibility-benefits'
    }
  });

  async function testEndpoint(name, method, url, data = null) {
    console.log(`📍 Testing ${name}...`);
    try {
      const options = data ? { data } : {};
      const response = method === 'POST' 
        ? await api.post(url, options)
        : await api.get(url, options);
      
      const status = response.status();
      const contentType = (response.headers()['content-type'] || '').toLowerCase();
      const text = await response.text();
      const isHtml = contentType.includes('text/html') || /^<!doctype html/i.test(text) || /^<html/i.test(text);
      
      if (isHtml) {
        console.log(`   ❌ HTML response (session expired) - Status: ${status}`);
        if (text.includes('/ciam/login')) {
          console.log(`   → Redirected to login page`);
        }
      } else if (status >= 200 && status < 300) {
        console.log(`   ✅ Success - Status: ${status}`);
        try {
          const json = JSON.parse(text);
          if (Array.isArray(json)) {
            console.log(`   → Got array with ${json.length} items`);
          } else if (json.data) {
            console.log(`   → Got object with 'data' field`);
          } else if (json.error || json.message) {
            console.log(`   → API error: ${json.error || json.message}`);
          }
        } catch {
          console.log(`   → Response is not JSON`);
        }
      } else {
        console.log(`   ⚠️ HTTP ${status}`);
        try {
          const json = JSON.parse(text);
          console.log(`   → ${json.message || json.error || 'Unknown error'}`);
        } catch {
          console.log(`   → ${text.substring(0, 100)}`);
        }
      }
    } catch (e) {
      console.log(`   ❌ Error: ${e.message}`);
    }
    console.log('');
  }

  // Test various endpoints
  await testEndpoint('Locations (no PLOC needed)', 'POST', '/provider-tools/v2/api/practice-location/locations', {});
  
  // Test with a fake patient ID to see how it fails
  const testEnrolleeId = '123456789W00';
  await testEndpoint(`Eligibility (test ID: ${testEnrolleeId})`, 'GET', `/provider-tools/v2/api/eligibility/patient/${testEnrolleeId}`);
  
  // Test claims endpoint
  await testEndpoint(`Claims (test ID: ${testEnrolleeId})`, 'POST', '/provider-tools/v2/api/claims/list', {
    subscriberId: testEnrolleeId,
    pageNumber: 1,
    pageSize: 10
  });

  await api.dispose();
  console.log('🏁 Test complete');
})().catch(e => {
  console.error('❌ Test failed:', e.message);
  process.exit(1);
});