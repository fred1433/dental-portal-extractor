import { DotExtractor } from '../extractors/dotExtractor';
import * as fs from 'fs';
import * as path from 'path';

async function testExtraction() {
  console.log('🚀 DOT Full Extraction Test\n');
  console.log('=' .repeat(50) + '\n');
  
  const extractor = new DotExtractor();
  
  try {
    await extractor.initialize('dot-storage.json');
    
    // Test with Maurice Berend
    const results = await extractor.extractFullData({
      memberId: '916797559',
      firstName: 'Maurice',
      lastName: 'Berend',
      birthDate: '12/16/1978',
      fromDate: '2024-06-01T00:00:00Z',
      toDate: '2025-09-13T00:00:00Z',
      allFamily: true // Extract data for whole family
    });
    
    // Save results
    const outputDir = 'out';
    fs.mkdirSync(outputDir, { recursive: true });
    
    const filename = `extraction-maurice-berend-${Date.now()}.json`;
    const filepath = path.join(outputDir, filename);
    
    fs.writeFileSync(filepath, JSON.stringify(results, null, 2));
    console.log(`\n💾 Results saved to: ${filepath}`);
    
    // Export claims to CSV
    const allClaims = [
      ...results.subscriber.claims,
      ...results.dependents.flatMap((d: any) => d.claims)
    ];
    
    if (allClaims.length > 0) {
      const csvContent = exportClaimsToCSV(allClaims);
      const csvPath = path.join(outputDir, `claims-maurice-berend-${Date.now()}.csv`);
      fs.writeFileSync(csvPath, csvContent);
      console.log(`💾 Claims CSV saved to: ${csvPath}`);
    }
    
    console.log('\n✨ Extraction completed successfully!');
    
  } catch (error) {
    console.error('❌ Extraction failed:', error);
  } finally {
    await extractor.close();
  }
}

function exportClaimsToCSV(claims: any[]): string {
  const headers = [
    'Service Date',
    'Claim Number',
    'Patient Name',
    'Procedure Code',
    'Procedure Description',
    'Tooth',
    'Billed Amount',
    'Allowed Amount',
    'Paid Amount',
    'Status'
  ];
  
  const rows = claims.map(claim => {
    return [
      claim.serviceDate || claim.dateOfService || '',
      claim.claimNumber || claim.id || '',
      claim.patientName || '',
      claim.procedureCode || '',
      claim.procedureDescription || '',
      claim.toothCode || claim.tooth || '',
      claim.billedAmount || claim.billed || '',
      claim.allowedAmount || claim.allowed || '',
      claim.paidAmount || claim.paid || '',
      claim.status || claim.claimStatus || ''
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',');
  });
  
  return [headers.join(','), ...rows].join('\n');
}

// Run the test
testExtraction().catch(console.error);