#!/usr/bin/env node
/* eslint-disable no-console */

/**
 * Wrapper script to run DDINS extraction with automatic session management
 * 1. Check session validity
 * 2. If expired, prompt for login
 * 3. Run extraction
 */

const { execSync } = require('child_process');
const path = require('path');

const DDINS_DIR = path.join(__dirname, '..', 'ddins-extractor');

function run(cmd, options = {}) {
  console.log(`$ ${cmd}`);
  try {
    execSync(cmd, { 
      stdio: 'inherit', 
      cwd: options.cwd || process.cwd(),
      ...options 
    });
    return true;
  } catch (error) {
    if (options.ignoreError) {
      return false;
    }
    process.exit(error.status || 1);
  }
}

async function main() {
  console.log('🦷 Delta Dental INS Extraction Runner');
  console.log('======================================');
  console.log('');

  // Step 1: Check session
  console.log('📋 Step 1: Checking session...');
  const sessionValid = run('node scripts/check-session.js', { 
    cwd: DDINS_DIR, 
    ignoreError: true 
  });

  if (!sessionValid) {
    console.log('');
    console.log('📋 Step 2: Session expired, running interactive login...');
    run('npm run login:interactive', { cwd: DDINS_DIR });
    
    // Re-check session after login
    console.log('');
    console.log('📋 Step 3: Verifying new session...');
    const sessionValidAfterLogin = run('node scripts/check-session.js', { 
      cwd: DDINS_DIR, 
      ignoreError: true 
    });
    
    if (!sessionValidAfterLogin) {
      console.error('❌ Login failed or session still invalid');
      process.exit(1);
    }
  }

  // Step 3: Run extraction
  console.log('');
  console.log('📋 Step 4: Running extraction...');
  
  // Pass through environment variables
  const env = { ...process.env };
  if (!env.MAX_PATIENTS) {
    env.MAX_PATIENTS = '10'; // Default to 10 patients if not specified
  }
  
  run('npm start', { 
    cwd: DDINS_DIR,
    env 
  });

  console.log('');
  console.log('✅ Extraction complete!');
}

// Run the wrapper
main().catch(error => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});