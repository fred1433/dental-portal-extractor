import { chromium } from 'playwright';
import * as fs from 'fs';

/**
 * Script pour capturer TOUS les appels API pendant la navigation manuelle
 * Laisse le navigateur ouvert et loggue tout
 */
async function sniffAllAPIs() {
  console.log('🕵️ API Sniffer - Capture tous les appels DOT Gateway\n');
  console.log('=' .repeat(60));
  
  const browser = await chromium.launch({ 
    headless: false,
    args: ['--window-size=1400,900']
  });
  
  const context = await browser.newContext({ 
    storageState: 'dot-storage.json',
    viewport: { width: 1400, height: 900 }
  });
  
  const page = await context.newPage();
  
  const apiCalls: any[] = [];
  
  // Capturer TOUTES les requêtes API
  page.on('requestfinished', async request => {
    const url = request.url();
    
    // Filtrer seulement les appels DOT Gateway
    if (url.includes('/api/dot-gateway/')) {
      const method = request.method();
      const endpoint = url.replace('https://www.dentalofficetoolkit.com', '');
      
      let requestBody = null;
      try {
        const postData = request.postData();
        if (postData) {
          requestBody = JSON.parse(postData);
        }
      } catch {}
      
      let responseStatus = null;
      let responseBody = null;
      
      try {
        const response = await request.response();
        if (response) {
          responseStatus = response.status();
          if (response.ok()) {
            try {
              responseBody = await response.json();
            } catch {}
          }
        }
      } catch {}
      
      const apiCall = {
        timestamp: new Date().toISOString(),
        method,
        endpoint,
        status: responseStatus,
        requestBody,
        responseBodySample: responseBody ? JSON.stringify(responseBody).substring(0, 200) : null
      };
      
      apiCalls.push(apiCall);
      
      // Afficher en temps réel
      console.log(`\n📡 ${method} ${endpoint}`);
      console.log(`   Status: ${responseStatus}`);
      
      if (requestBody) {
        console.log(`   Request Body:`, JSON.stringify(requestBody, null, 2).substring(0, 300));
      }
      
      // Détection spéciale pour benefits et claims
      if (endpoint.includes('memberbenefits') && responseStatus === 200) {
        console.log('   ✅ BENEFITS CALL SUCCESSFUL!');
        // Sauvegarder le payload qui marche
        fs.writeFileSync('working-benefits-payload.json', JSON.stringify(requestBody, null, 2));
        console.log('   💾 Saved to working-benefits-payload.json');
      }
      
      if (endpoint.includes('claim') && endpoint.includes('detail')) {
        console.log('   ✅ CLAIM DETAIL ENDPOINT FOUND!');
        fs.writeFileSync('claim-detail-endpoint.json', JSON.stringify(apiCall, null, 2));
        console.log('   💾 Saved to claim-detail-endpoint.json');
      }
    }
  });
  
  // Naviguer vers la page d'accueil
  await page.goto('https://www.dentalofficetoolkit.com/dot-ui/home/', {
    waitUntil: 'networkidle'
  });
  
  console.log('\n✅ Navigateur ouvert et prêt!');
  console.log('\n📋 INSTRUCTIONS:');
  console.log('=' .repeat(60));
  console.log('1️⃣  Va sur "Member" → recherche Maurice Berend (916797559)');
  console.log('2️⃣  Clique sur "Member Details & Benefits"');
  console.log('3️⃣  Expand "Routine Procedures" ou "Coverage" (pour capturer benefits)');
  console.log('4️⃣  Va sur "Claims" → recherche des claims');
  console.log('5️⃣  CLIQUE SUR UN CLAIM pour voir les détails (CDT codes!)');
  console.log('=' .repeat(60));
  console.log('\n⏰ Le navigateur restera ouvert 5 minutes...');
  console.log('🔍 Tous les appels API sont loggués ici\n');
  
  // Attendre 5 minutes
  await page.waitForTimeout(5 * 60 * 1000);
  
  // Sauvegarder tous les appels
  fs.writeFileSync('all-api-calls.json', JSON.stringify(apiCalls, null, 2));
  console.log(`\n💾 Sauvegardé ${apiCalls.length} appels API dans all-api-calls.json`);
  
  await browser.close();
  console.log('✅ Terminé!');
}

sniffAllAPIs().catch(console.error);