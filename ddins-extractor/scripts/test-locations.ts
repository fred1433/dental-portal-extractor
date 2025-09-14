// scripts/test-locations.ts
import { createDdinsApi, closeApi } from '../src/ddinsApi';
import { getPracticeLocations } from '../src/locations';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config();

async function testLocations() {
  const storageStatePath = path.join(__dirname, '..', 'ddins-storage.json');
  const ptUserId = process.env.DDINS_PT_USERID || 'Payoraccess4771';
  
  console.log('🔍 Testing Delta Dental API connection...');
  console.log('📁 Using session:', storageStatePath);
  console.log('👤 PT User ID:', ptUserId);
  
  const api = await createDdinsApi({
    storageStatePath,
    ptUserId
  });
  
  try {
    console.log('\n📍 Fetching practice locations...');
    const locations = await getPracticeLocations(api);
    
    console.log('\n✅ Available locations:');
    console.log(JSON.stringify(locations, null, 2));
    
    // Try to extract location IDs if they exist
    if (Array.isArray(locations)) {
      locations.forEach((loc: any, index: number) => {
        console.log(`\nLocation ${index + 1}:`);
        console.log(`  ID: ${loc.mtvPlocId || loc.id || loc.locationId || 'unknown'}`);
        console.log(`  Name: ${loc.name || loc.practiceName || 'unknown'}`);
        console.log(`  Address: ${loc.address || loc.street || 'unknown'}`);
      });
    } else if (locations && typeof locations === 'object') {
      // Single location or wrapped response
      const loc = locations.location || locations.data || locations;
      console.log(`\n📍 Primary location:`);
      console.log(`  ID: ${loc.mtvPlocId || loc.id || loc.locationId || 'unknown'}`);
      console.log(`  Name: ${loc.name || loc.practiceName || 'unknown'}`);
      console.log(`  Address: ${loc.address || loc.street || 'unknown'}`);
    }
    
  } catch (error: any) {
    console.error('❌ Failed:', error.message);
    if (error.message.includes('401')) {
      console.error('🔑 Session expired. Please run: npm run login');
    }
  } finally {
    await closeApi(api);
  }
}

testLocations();