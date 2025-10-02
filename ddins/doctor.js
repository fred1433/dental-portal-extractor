#!/usr/bin/env node
/* eslint-disable no-console */
const { request } = require('playwright');
const path = require('path');
require('dotenv').config();

(async () => {
  const storage = process.env.DDINS_SESSION_PATH || path.join(__dirname, '.ddins-session', 'storageState.json');
  const pt = process.env.DDINS_PT_USERID || '';
  console.log('🩺 DDINS Doctor');
  console.log('  storageState:', storage);
  console.log('  pt-userid    :', pt || '(empty)');
  const api = await request.newContext({
    baseURL: 'https://www.deltadentalins.com',
    storageState: storage,
    extraHTTPHeaders: { accept: 'application/json', 'content-type': 'application/json', 'pt-userid': pt }
  });
  try {
    const r = await api.post('/provider-tools/v2/api/practice-location/locations', { data: {} });
    const ctype = (r.headers()['content-type']||'').toLowerCase();
    const text = await r.text();
    if (!r.ok() || ctype.includes('text/html') || /^<(!DOCTYPE|html)/i.test(text)) {
      console.error('❌ Session KO → redirection login / HTML response');
      process.exit(2);
    }
    console.log('✅ Session OK (locations accessible)');
    try { const j = JSON.parse(text); const first = (Array.isArray(j)?j:(j?.data||[]))[0]; if (first) console.log('  sample PLOC:', first.mtvPlocId||first.id||first.locationId); } catch {}
    process.exit(0);
  } catch (e) {
    console.error('❌ Erreur doctor:', e.message);
    process.exit(3);
  } finally {
    await api.dispose();
  }
})();
