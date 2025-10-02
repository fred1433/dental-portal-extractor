/**
 * Migration script: Import all JSON files from data/patients/ to MongoDB
 * Run with: node db/migrate-to-mongodb.js
 */

const fs = require('fs');
const path = require('path');
const { savePatient, connect, disconnect, listPatients } = require('./mongodb-client');

async function migrateToMongoDB() {
  console.log('🚀 Starting migration from files to MongoDB...\n');

  try {
    // Connect to MongoDB
    const db = await connect();
    if (!db) {
      console.error('❌ Failed to connect to MongoDB');
      console.log('\n💡 Make sure MONGODB_URI is set in .env');
      process.exit(1);
    }

    // Read all patient JSON files
    const patientsDir = path.join(__dirname, '..', 'data', 'patients');
    const files = fs.readdirSync(patientsDir)
      .filter(f => f.endsWith('.json') && !f.includes('_schema'));

    console.log(`📂 Found ${files.length} patient files\n`);

    let successCount = 0;
    let errorCount = 0;

    for (const file of files) {
      try {
        const filePath = path.join(patientsDir, file);
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

        await savePatient(data);

        const patientName = `${data.patient?.firstName || 'Unknown'} ${data.patient?.lastName || 'Unknown'}`;
        console.log(`✅ ${patientName} (${data.extraction?.portalCode || 'Unknown portal'})`);
        successCount++;
      } catch (error) {
        console.error(`❌ Failed to import ${file}:`, error.message);
        errorCount++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 MIGRATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Success: ${successCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log(`📁 Total: ${files.length}`);

    // Verify
    console.log('\n🔍 Verifying MongoDB...');
    const patientsInDB = await listPatients();
    console.log(`✅ MongoDB now has ${patientsInDB.length} patients`);

    await disconnect();
    console.log('\n✅ Migration complete!');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
migrateToMongoDB();
