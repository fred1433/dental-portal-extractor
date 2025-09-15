#!/usr/bin/env node
/* eslint-disable no-console */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const STORAGE_PATH = process.env.DDINS_SESSION_PATH
  || path.join(process.cwd(), '..', '.ddins-session', 'storageState.json');
const START_URL = 'https://www.deltadentalins.com/provider-tools/v2';

// Ensure session directory exists
const sessionDir = path.dirname(STORAGE_PATH);
if (!fs.existsSync(sessionDir)) {
  fs.mkdirSync(sessionDir, { recursive: true });
}

function log(...a){ console.log(...a); }

(async () => {
  log('🦷 DDINS - Interactive Login (fail-safe)');
  const browser = await chromium.launch({ headless: false, args: ['--window-size=1400,900'] });
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 }});
  const page = await context.newPage();

  const username = process.env.DDINS_USERNAME;
  const password = process.env.DDINS_PASSWORD;
  const ptUserId = process.env.DDINS_PT_USERID || username || '';

  // 1) Aller sur Provider Tools (la page va rediriger vers /ciam/login si non loggé)
  await page.goto(START_URL, { waitUntil: 'domcontentloaded', timeout: 90000 });

  // 2) Laisser l'utilisateur se connecter (ou auto-remplir si vars présentes)
  try {
    await page.waitForURL('**/ciam/login**', { timeout: 60000 });
    log('🔐 Page de login détectée');

    if (username && password) {
      // Certains locators varient; on essaie plusieurs sélecteurs sans bloquer
      const userField = await page.locator('input[name="identifier"], input[name="username"], [aria-label="Username"]').first();
      if (await userField.isVisible().catch(()=>false)) await userField.fill(username);

      const nextBtn = await page.locator('button:has-text("Next"), input[type="submit"][value="Next"]').first();
      if (await nextBtn.isVisible().catch(()=>false)) await nextBtn.click();

      await page.waitForTimeout(1000);

      const passField = await page.locator('input[type="password"], [aria-label="Password"]').first();
      if (await passField.isVisible().catch(()=>false)) await passField.fill(password);

      const verifyBtn = await page.locator('button:has-text("Verify"), input[type="submit"][value="Verify"], button[type="submit"]').first();
      if (await verifyBtn.isVisible().catch(()=>false)) await verifyBtn.click();

      log('⏳ Auth soumise (compléter MFA si demandé)…');
    } else {
      log('👤 Pas de credentials dans .env — fais le login manuellement.');
    }
  } catch { /* pas de /ciam/login → déjà loggé ? on continue */ }

  // 3) Attendre un signe "loggé" (nav drawer / liens provider tools / PT User ID)
  await Promise.race([
    page.waitForURL('**/provider-tools/**', { timeout: 180000 }),
    page.waitForSelector('button[aria-label="Open navigation drawer"], a[href*="eligibility-benefits"], a[href*="patient-roster"], label:has-text("PT User ID")', { timeout: 180000 })
  ]);

  // 4) PT User ID si demandé
  const ptField = page.locator('input[name="ptUserId"], input[placeholder*="PT User"]');
  if (await ptField.isVisible().catch(()=>false)) {
    log(`📝 PT User ID détecté → ${ptUserId}`);
    await ptField.fill(ptUserId);
    const submit = page.locator('button:has-text("Submit"), button:has-text("Continue"), button[type="submit"]').first();
    if (await submit.isVisible().catch(()=>false)) await submit.click();
    await page.waitForTimeout(1500);
  }

  // 5) Sauvegarder IMMÉDIATEMENT l'état (cookies Okta + storage)
  await context.storageState({ path: STORAGE_PATH });
  // Optionnel : renforcer la présence en localStorage
  try {
    await page.evaluate((v) => localStorage.setItem('pt-userid', v), ptUserId);
  } catch {}
  log(`💾 Session sauvegardée → ${path.relative(process.cwd(), STORAGE_PATH)}`);

  await browser.close();
  log('✅ Terminé.');
  process.exit(0);
})().catch(async (e) => {
  console.error('❌ Login interactif a échoué:', e.message);
  process.exit(1);
});