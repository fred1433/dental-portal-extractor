import { DotExtractor } from '../extractors/dotExtractor';
import { exportToJSON, exportToCSV, generateSummary } from '../util/exporters';
import * as fs from 'fs';

/**
 * Final extraction script with all features
 * Usage: npx ts-node src/scripts/extract-final.ts
 */
async function extractFinal() {
  // Parse command line arguments
  const args = process.argv.slice(2);
  const options = {
    memberId: process.env.MEMBER_ID || '916797559',
    firstName: process.env.FIRST_NAME || 'Maurice', 
    lastName: process.env.LAST_NAME || 'Berend',
    birthDate: process.env.BIRTH_DATE || '12/16/1978',
    allFamily: args.includes('--allFamily') || true,
    csv: args.includes('--csv') || true,
    fromDate: new Date('2024-01-01').toISOString(),
    toDate: new Date().toISOString()
  };
  
  console.log('🚀 DOT Data Extraction - Final Version\n');
  console.log('=' .repeat(60));
  console.log(`Member: ${options.firstName} ${options.lastName} (${options.memberId})`);
  console.log(`Birth Date: ${options.birthDate}`);
  console.log(`Family: ${options.allFamily ? 'Yes' : 'No'}`);
  console.log(`Export CSV: ${options.csv ? 'Yes' : 'No'}`);
  console.log('=' .repeat(60) + '\n');
  
  const extractor = new DotExtractor();
  
  try {
    await extractor.initialize('dot-storage.json');
    
    const data = await extractor.extractFullData({
      memberId: options.memberId,
      firstName: options.firstName,
      lastName: options.lastName,
      birthDate: options.birthDate,
      allFamily: options.allFamily,
      fromDate: options.fromDate,
      toDate: options.toDate
    });
    
    // Ensure output directory exists
    if (!fs.existsSync('out')) {
      fs.mkdirSync('out');
    }
    
    // Generate filenames
    const timestamp = Date.now();
    const safeName = options.lastName.toLowerCase().replace(/\s+/g, '-');
    const jsonFile = `out/extraction-${safeName}-${timestamp}.json`;
    const csvFile = `out/claims-${safeName}-${timestamp}.csv`;
    
    // Export JSON (always)
    exportToJSON(data, jsonFile);
    
    // Export CSV (if requested)
    if (options.csv) {
      exportToCSV(data, csvFile);
    }
    
    // Generate and display summary
    const summary = generateSummary(data);
    console.log('\n' + '=' .repeat(60));
    console.log('📊 EXTRACTION COMPLETE');
    console.log('=' .repeat(60));
    console.log(`✅ Total claims: ${summary.totalClaims}`);
    console.log(`✅ Claims with details: ${summary.totalWithDetails} (${summary.detailCoverage})`);
    console.log(`✅ Total procedures: ${summary.totalLineItems}`);
    console.log(`✅ Unique CDT codes: ${summary.uniqueProcedures.length}`);
    
    if (summary.uniqueProcedures.length > 0 && summary.uniqueProcedures.length <= 20) {
      console.log(`   ${summary.uniqueProcedures.join(', ')}`);
    }
    
    console.log('\n📁 Files saved:');
    console.log(`   JSON: ${jsonFile}`);
    if (options.csv) {
      console.log(`   CSV: ${csvFile}`);
    }
    
  } catch (error) {
    console.error('❌ Extraction failed:', error);
    process.exit(1);
  } finally {
    await extractor.close();
  }
}

// Run
extractFinal().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});