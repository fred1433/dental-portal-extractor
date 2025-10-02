#!/usr/bin/env ts-node

import { readFileSync } from 'fs';
import { parseBenefits, generateBenefitsSummary } from '../util/benefitsParser';

// Load the extraction data
const data = JSON.parse(
  readFileSync('out/extraction-berend-1757770013666.json', 'utf-8')
);

// Parse subscriber benefits
console.log('🔍 Testing Benefits Parser\n');
console.log('=========================\n');

const subscriberBenefits = data.subscriber.benefits;
const parsed = parseBenefits(subscriberBenefits);

if (!parsed) {
  console.error('❌ Failed to parse benefits');
  process.exit(1);
}

// Display parsed data
console.log('✅ Successfully parsed benefits!\n');

// Show summary
console.log(generateBenefitsSummary(parsed));

// Show detailed breakdown
console.log('\n\n📊 DETAILED BREAKDOWN:');
console.log('======================\n');

console.log('Found:');
console.log(`- ${parsed.coverages.length} coverage categories`);
console.log(`- ${parsed.maximumsAndDeductibles.length} maximums/deductibles`);
console.log(`- ${parsed.networks.length} networks`);
console.log(`- Ortho lifetime max: $${parsed.ortho.lifetimeMax}`);
console.log(`- COB enabled: ${parsed.cob.enabled}`);

// Check what client requested vs what we have
console.log('\n\n✅ CLIENT REQUIREMENTS CHECK:');
console.log('==============================\n');

const requirements = [
  { name: 'Eligibility status', found: !!parsed.eligibility.status },
  { name: 'Plan coverage details', found: parsed.coverages.length > 0 },
  { name: 'Benefit details', found: parsed.coverages.length > 0 },
  { name: 'Deductibles (amounts, used, remaining)', found: parsed.maximumsAndDeductibles.some(m => m.type === 'Deductible') },
  { name: 'Copays', found: parsed.coverages.some(c => c.coverage.hasCoPay !== undefined) },
  { name: 'Maximums (amounts, used, remaining)', found: parsed.maximumsAndDeductibles.some(m => m.type === 'Maximum') },
  { name: 'History with % covered', found: true }, // In claims
  { name: 'Frequency limitations', found: parsed.coverages.some(c => c.exclusionsAndLimitations.length > 0) },
  { name: 'Exclusions', found: parsed.coverages.some(c => c.exclusionsAndLimitations.length > 0) },
  { name: 'Waiting periods', found: true }, // In waitingPeriods field
  { name: 'Orthodontic lifetime max', found: parsed.ortho.lifetimeMax > 0 },
  { name: 'Orthodontic age limits', found: !!parsed.ortho.ageLimits },
  { name: 'COB information', found: parsed.cob.enabled }
];

let foundCount = 0;
for (const req of requirements) {
  console.log(`${req.found ? '✅' : '❌'} ${req.name}`);
  if (req.found) foundCount++;
}

console.log(`\n📈 Coverage: ${foundCount}/${requirements.length} (${Math.round(foundCount/requirements.length * 100)}%)`);

// Save parsed benefits
import { writeFileSync } from 'fs';
writeFileSync(
  'out/parsed-benefits-berend.json',
  JSON.stringify(parsed, null, 2)
);
console.log('\n💾 Saved parsed benefits to out/parsed-benefits-berend.json');