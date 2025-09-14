// src/index.ts
import { crawlAllPatients } from './crawlAll';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config();

async function main() {
  const storageStatePath = path.join(__dirname, '..', 'ddins-storage.json');
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
    console.error('❌ Extraction failed:', error.message);
    if (error.message.includes('401') || error.message.includes('Unauthorized')) {
      console.error('🔑 Session expired. Please run: npm run login');
    }
    process.exit(1);
  }
}

main();