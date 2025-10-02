import { createDotApi, closeApi } from '../sdk/dotClient';
import { extractPatient } from '../extractors/patientExtractor';
import { logger, LogLevel } from '../util/logger';
import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * Get command line argument
 */
function getArg(name: string, defaultValue?: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  return index > -1 && process.argv[index + 1] ? process.argv[index + 1] : defaultValue;
}

/**
 * Show usage help
 */
function showHelp() {
  console.log(`
DOT Data Extractor
==================

Usage: ts-node src/scripts/extract.ts [options]

Options:
  --memberId <id>        Member ID to search for
  --firstName <name>     Patient first name
  --lastName <name>      Patient last name
  --birthDate <date>     Patient birth date (MM/DD/YYYY format)
  --from <date>          Start date for claims (ISO format, default: 90 days ago)
  --to <date>            End date for claims (ISO format, default: today)
  --storage <path>       Storage state file (default: dot-storage.json)
  --output <dir>         Output directory (default: out)
  --verbose              Enable verbose logging
  --help                 Show this help message

Examples:
  # Search by member ID
  ts-node src/scripts/extract.ts --memberId 916797559

  # Search by patient details
  ts-node src/scripts/extract.ts --firstName Maurice --lastName Berend --birthDate 12/16/1978

  # Search with date range
  ts-node src/scripts/extract.ts --memberId 916797559 --from 2025-06-01T00:00:00Z --to 2025-09-13T00:00:00Z

Note: You must run 'npm run login' first to create the session storage file.
`);
}

/**
 * Export claims to CSV
 */
function exportClaimsToCSV(claims: any[], outputPath: string) {
  const headers = [
    'serviceDate',
    'claimNumber',
    'patientName',
    'procedureCode',
    'procedureDescription',
    'toothCode',
    'surface',
    'billedAmount',
    'allowedAmount',
    'paidAmount',
    'deductible',
    'coinsurance',
    'status'
  ];
  
  const rows = claims.map(claim => {
    const values = [
      claim.serviceDate || claim.dateOfService || '',
      claim.claimNumber || claim.id || '',
      claim.patientName || claim.patient?.name || '',
      claim.procedureCode || claim.procedure?.code || '',
      claim.procedureDescription || claim.procedure?.description || '',
      claim.toothCode || claim.tooth || '',
      claim.surface || '',
      claim.billedAmount || claim.billed || '',
      claim.allowedAmount || claim.allowed || '',
      claim.paidAmount || claim.paid || '',
      claim.deductible || '',
      claim.coinsurance || '',
      claim.status || claim.claimStatus || ''
    ];
    
    // Escape and quote values
    return values.map(v => {
      const str = String(v).replace(/"/g, '""');
      return `"${str}"`;
    }).join(',');
  });
  
  const csv = [headers.join(','), ...rows].join('\n');
  fs.writeFileSync(outputPath, csv, 'utf-8');
}

/**
 * Main extraction function
 */
async function main() {
  // Parse arguments
  const memberId = getArg('memberId');
  const firstName = getArg('firstName');
  const lastName = getArg('lastName');
  const birthDate = getArg('birthDate');
  const from = getArg('from');
  const to = getArg('to');
  const storagePath = getArg('storage') || 'dot-storage.json';
  const outputDir = getArg('output') || 'out';
  const verbose = process.argv.includes('--verbose');
  const help = process.argv.includes('--help');
  
  if (help) {
    showHelp();
    process.exit(0);
  }
  
  // Validate inputs
  if (!memberId && !(firstName && lastName && birthDate)) {
    console.error('❌ Error: You must provide either --memberId OR (--firstName, --lastName, --birthDate)');
    console.log('Run with --help for usage information');
    process.exit(1);
  }
  
  // Check storage file exists
  if (!fs.existsSync(storagePath)) {
    console.error(`❌ Error: Storage file not found: ${storagePath}`);
    console.log('Please run "npm run login" first to create the session');
    process.exit(1);
  }
  
  // Set log level
  if (verbose) {
    logger.setLevel(LogLevel.DEBUG);
  }
  
  console.log('🚀 DOT Data Extractor');
  console.log('====================\n');
  
  let api;
  
  try {
    // Create API client
    logger.info('Creating API client with session...');
    api = await createDotApi(storagePath);
    
    // Extract patient data
    logger.info('Starting extraction process...');
    const bundle = await extractPatient(api, {
      memberId,
      firstName,
      lastName,
      birthDate,
      from,
      to
    });
    
    // Create output directory
    fs.mkdirSync(outputDir, { recursive: true });
    
    // Generate filename
    const patientId = memberId || `${firstName}-${lastName}`;
    const timestamp = Date.now();
    
    // Save JSON
    const jsonPath = path.join(outputDir, `patient-${patientId}-${timestamp}.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(bundle, null, 2), 'utf-8');
    logger.success(`Patient data saved: ${jsonPath}`);
    
    // Save claims CSV
    if (bundle.claims && bundle.claims.length > 0) {
      const csvPath = path.join(outputDir, `claims-${patientId}-${timestamp}.csv`);
      exportClaimsToCSV(bundle.claims, csvPath);
      logger.success(`Claims CSV saved: ${csvPath}`);
    }
    
    // Print summary
    console.log('\n📊 Extraction Summary');
    console.log('====================');
    console.log(`✅ Patient: ${bundle.subscriber.firstName} ${bundle.subscriber.lastName}`);
    console.log(`✅ Member ID: ${bundle.subscriber.memberId || 'N/A'}`);
    console.log(`✅ Plan: ${bundle.meta.planAcronym || 'N/A'}`);
    console.log(`✅ Family Members: ${bundle.family.length}`);
    console.log(`✅ Claims Found: ${bundle.claims.length}`);
    console.log(`✅ Benefits: ${bundle.benefits ? 'Retrieved' : 'Not available'}`);
    console.log(`✅ Routine Procedures: ${bundle.routineProcedures ? 'Retrieved' : 'Not available'}`);
    console.log(`✅ Prior Auth: ${bundle.priorAuth ? 'Retrieved' : 'Not available'}`);
    console.log(`✅ Client Info: ${bundle.client ? 'Retrieved' : 'Not available'}`);
    
    console.log('\n✨ Extraction completed successfully!');
    
  } catch (error) {
    logger.error('Extraction failed', error as Error);
    
    if (error instanceof Error) {
      if (error.message.includes('session expired')) {
        console.error('\n⚠️  Session expired. Please run "npm run login" to refresh');
      } else if (error.message.includes('HTTP 401') || error.message.includes('HTTP 403')) {
        console.error('\n⚠️  Authentication failed. Please run "npm run login" to authenticate');
      } else if (error.message.includes('HTTP 404')) {
        console.error('\n⚠️  Patient not found. Please check the member ID and details');
      }
    }
    
    process.exit(1);
    
  } finally {
    // Clean up
    if (api) {
      await closeApi(api);
    }
  }
}

// Run the script
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}