// src/index.ts
import { crawlAllPatients } from './crawlAll';
import { HtmlResponseError } from './http';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

async function main() {
  const storageStatePath = process.env.DDINS_SESSION_PATH || path.join(__dirname, '..', '..', '.ddins-session', 'storageState.json');
  const ptUserId = process.env.DDINS_PT_USERID || 'Payoraccess4771';
  const practiceLocationId = process.env.DDINS_PLOC || '107313380005';
  const maxPatients = process.env.MAX_PATIENTS ? parseInt(process.env.MAX_PATIENTS) : undefined;
  
  console.log('🦷 Delta Dental Insurance Data Extractor');
  console.log('========================================');
  console.log('📁 Storage:', storageStatePath);
  console.log('👤 PT User ID:', ptUserId);
  console.log('📍 Location ID:', practiceLocationId);
  if (maxPatients) {
    console.log('🔢 Max patients:', maxPatients);
  }
  console.log('');
  
  try {
    await crawlAllPatients({
      storageStatePath,
      ptUserId,
      practiceLocationId,
      outDir: 'out',
      maxPatients
    });
  } catch (error: any) {
    if (error instanceof HtmlResponseError || error.code === 'HTML_RESPONSE') {
      console.error('❌ Session expired - HTML response detected');
      console.error('   Run: npm run login:interactive');
      process.exit(10); // Special exit code for session expired
    } else {
      console.error('❌ Extraction failed:', error.message);
      if (error.message.includes('401') || error.message.includes('Unauthorized')) {
        console.error('🔑 Session expired. Please run: npm run login:interactive');
      }
      process.exit(1);
    }
  }
}

main();