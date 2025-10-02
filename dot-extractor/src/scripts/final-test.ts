#!/usr/bin/env ts-node

import { extractDotData } from '../extractors/dotExtractor';
import { writeFileSync } from 'fs';

async function main() {
  console.log('🚀 TEST FINAL - Extraction complète avec Benefits Parser');
  console.log('=========================================================\n');
  
  try {
    // Extract all data for Maurice and family
    const data = await extractDotData({
      memberId: '916797559',
      firstName: 'MAURICE',
      lastName: 'BEREND',
      birthDate: '12/16/1978',
      allFamily: true
    });
    
    // Save complete data
    const timestamp = Date.now();
    const filename = `out/final-extraction-${timestamp}.json`;
    writeFileSync(filename, JSON.stringify(data, null, 2));
    console.log(`\n💾 Saved complete extraction to ${filename}`);
    
    // Verify what we have
    console.log('\n\n✅ VERIFICATION FINALE:');
    console.log('========================\n');
    
    // Check subscriber
    const sub = data.subscriber;
    console.log('SUBSCRIBER:');
    console.log(`  ✓ Info: ${sub.info ? 'OK' : 'MISSING'}`);
    console.log(`  ✓ Benefits raw: ${sub.benefits ? 'OK' : 'MISSING'}`);
    console.log(`  ✓ Benefits parsed: ${sub.benefitsParsed ? 'OK' : 'MISSING'}`);
    console.log(`  ✓ Claims: ${sub.claims.length} claims`);
    
    if (sub.benefitsParsed) {
      console.log(`    - ${sub.benefitsParsed.coverages.length} coverages`);
      console.log(`    - ${sub.benefitsParsed.maximumsAndDeductibles.length} max/deductibles`);
      console.log(`    - Ortho max: $${sub.benefitsParsed.ortho.lifetimeMax}`);
      console.log(`    - COB: ${sub.benefitsParsed.cob.enabled ? 'Yes' : 'No'}`);
    }
    
    // Check dependents
    console.log(`\nDEPENDENTS: ${data.dependents.length}`);
    for (const dep of data.dependents) {
      const name = `${dep.info.dependentFirstName} ${dep.info.dependentLastName}`;
      console.log(`  ${name}:`);
      console.log(`    ✓ Benefits: ${dep.benefitsParsed ? 'OK' : dep.benefits ? 'Raw only' : 'MISSING'}`);
      console.log(`    ✓ Claims: ${dep.claims.length}`);
    }
    
    // Summary of all claims
    const allClaims = [
      ...sub.claims,
      ...data.dependents.flatMap((d: any) => d.claims)
    ];
    
    // Count unique CDT codes
    const cdtCodes = new Set<string>();
    for (const claim of allClaims) {
      if (claim.detail?.lineItems) {
        for (const line of claim.detail.lineItems) {
          if (line.procedureCode) {
            cdtCodes.add(line.procedureCode);
          }
        }
      }
    }
    
    console.log(`\nTOTAL CLAIMS: ${allClaims.length}`);
    console.log(`UNIQUE CDT CODES: ${cdtCodes.size}`);
    console.log(`CDT CODES: ${Array.from(cdtCodes).sort().join(', ')}`);
    
    // Final check against client requirements
    console.log('\n\n📋 CLIENT REQUIREMENTS - FINAL CHECK:');
    console.log('======================================\n');
    
    const checks = [
      ['Eligibility status', sub.info?.eligibilityStatus === 'Active'],
      ['Plan details', sub.benefitsParsed?.planInfo?.productName],
      ['Coverages with %', sub.benefitsParsed?.coverages?.length > 0],
      ['Deductibles', sub.benefitsParsed?.maximumsAndDeductibles?.some((m: any) => m.type === 'Deductible')],
      ['Maximums', sub.benefitsParsed?.maximumsAndDeductibles?.some((m: any) => m.type === 'Maximum')],
      ['Claims history', allClaims.length > 0],
      ['CDT codes', cdtCodes.size > 0],
      ['Exclusions/Limitations', sub.benefitsParsed?.coverages?.some((c: any) => c.exclusionsAndLimitations?.length > 0)],
      ['Ortho info', sub.benefitsParsed?.ortho?.lifetimeMax > 0],
      ['COB info', sub.benefitsParsed?.cob?.enabled],
      ['Networks', sub.benefitsParsed?.networks?.length > 0],
      ['Family coverage', data.dependents.length > 0]
    ];
    
    let passed = 0;
    for (const [name, check] of checks) {
      const status = check ? '✅' : '❌';
      console.log(`${status} ${name}`);
      if (check) passed++;
    }
    
    const percentage = Math.round((passed / checks.length) * 100);
    console.log(`\n🎯 SCORE FINAL: ${passed}/${checks.length} (${percentage}%)`);
    
    if (percentage >= 90) {
      console.log('\n🎉 EXTRACTION COMPLÈTE ET RÉUSSIE !');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main();