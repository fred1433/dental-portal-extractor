// scripts/login.ts
import { chromium } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

const STORAGE_PATH = path.join(__dirname, '..', 'ddins-storage.json');

async function login() {
  console.log('🌐 Opening Delta Dental Insurance login page...');
  console.log('📁 Session will be saved to:', STORAGE_PATH);
  
  const browser = await chromium.launch({ 
    headless: false,
    channel: 'chrome' 
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Naviguer vers la page de connexion
  await page.goto('https://www.deltadentalins.com/provider-tools/v2');
  
  console.log('👤 Please login manually...');
  console.log('⏳ Waiting for successful login...');
  
  // Attendre que l'utilisateur soit connecté
  // On détecte la connexion par la présence d'un élément spécifique ou changement d'URL
  await page.waitForURL('**/provider-tools/v2/**', { 
    timeout: 300000 // 5 minutes 
  });
  
  // Attendre un peu pour s'assurer que tous les cookies sont définis
  await page.waitForTimeout(3000);
  
  // Sauvegarder l'état de stockage
  await context.storageState({ path: STORAGE_PATH });
  
  console.log('✅ Login successful! Session saved to:', STORAGE_PATH);
  
  // Optionnel : capturer le pt-userid depuis les requêtes
  let ptUserId: string | undefined;
  page.on('request', req => {
    const headers = req.headers();
    if (!ptUserId && headers['pt-userid']) {
      ptUserId = headers['pt-userid'];
      console.log('📝 Detected pt-userid:', ptUserId);
      
      // Sauvegarder dans un fichier de config
      const configPath = path.join(__dirname, '..', '.env');
      const envContent = fs.existsSync(configPath) 
        ? fs.readFileSync(configPath, 'utf-8') 
        : '';
      
      if (!envContent.includes('DDINS_PT_USERID')) {
        fs.appendFileSync(configPath, `\nDDINS_PT_USERID=${ptUserId}\n`);
        console.log('💾 Saved pt-userid to .env file');
      }
    }
  });
  
  // Faire une navigation pour déclencher des requêtes et capturer pt-userid
  await page.goto('https://www.deltadentalins.com/provider-tools/v2/my-patients');
  await page.waitForTimeout(5000);
  
  await browser.close();
  console.log('🎉 Setup complete!');
}

login().catch(console.error);