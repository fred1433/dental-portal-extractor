import { DotExtractor } from '../extractors/dotExtractor';
import * as fs from 'fs';

async function extractWithDetails() {
  const extractor = new DotExtractor();
  
  try {
    await extractor.initialize('dot-storage.json');
    
    // Test with Maurice Berend
    console.log('🎯 Extracting data for Maurice Berend with claim details...\n');
    console.log('=' .repeat(60) + '\n');
    
    const data = await extractor.extractFullData({
      memberId: '916797559',
      firstName: 'Maurice',
      lastName: 'Berend',
      birthDate: '12/16/1978',
      allFamily: true,
      fromDate: new Date('2024-01-01').toISOString(),
      toDate: new Date().toISOString()
    });
    
    // Save full JSON
    const timestamp = Date.now();
    const filename = `out/extraction-with-details-${timestamp}.json`;
    fs.writeFileSync(filename, JSON.stringify(data, null, 2));
    console.log(`\n💾 Full data saved to ${filename}`);
    
    // Display sample claim with details
    console.log('\n📋 Sample Claim with Details:');
    console.log('=' .repeat(60));
    
    const allClaims = [
      ...data.subscriber.claims,
      ...data.dependents.flatMap((d: any) => d.claims)
    ];
    
    const claimWithDetail = allClaims.find((c: any) => c.detail);
    if (claimWithDetail) {
      console.log(`Claim Number: ${claimWithDetail.claimNumber}`);
      console.log(`Patient: ${claimWithDetail.patientFirstName} ${claimWithDetail.patientLastName}`);
      console.log(`Service Date: ${claimWithDetail.serviceDate}`);
      console.log(`Provider: ${claimWithDetail.providerName}`);
      
      if (claimWithDetail.detail) {
        console.log('\n🦷 Procedures from Detail:');
        // Display procedures if they exist in the detail
        if (claimWithDetail.detail.procedures) {
          claimWithDetail.detail.procedures.forEach((proc: any, i: number) => {
            console.log(`  ${i+1}. CDT ${proc.procedureCode}: ${proc.description}`);
            console.log(`     Tooth: ${proc.toothNumber || 'N/A'}`);
            console.log(`     Amount: $${proc.amount || proc.chargedAmount || 'N/A'}`);
          });
        } else {
          // Display whatever fields are in the detail
          console.log('  Detail fields:', Object.keys(claimWithDetail.detail).join(', '));
        }
      }
    } else {
      console.log('No claims with details found');
    }
    
    // Summary stats
    console.log('\n📊 Extraction Statistics:');
    console.log('=' .repeat(60));
    console.log(`Total claims extracted: ${allClaims.length}`);
    console.log(`Claims with details: ${allClaims.filter((c: any) => c.detail).length}`);
    console.log(`Claims without details: ${allClaims.filter((c: any) => !c.detail).length}`);
    
  } catch (error) {
    console.error('❌ Extraction failed:', error);
  } finally {
    await extractor.close();
  }
}

extractWithDetails().catch(console.error);