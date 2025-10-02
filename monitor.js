const cron = require('node-cron');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Import des services
const DNOAService = require('./dnoa/dnoa-service');
const DentaQuestService = require('./dentaquest-html-scraping/dentaquest-service');
const MetLifeService = require('./metlife/metlife-service');
const CignaService = require('./cigna/cigna-service');
const DOTService = require('./dot-extractor/dot-service');
const DDINSService = require('./ddins/DDINSApiClient');

// Patients de test (données réelles de l'interface)
const TEST_PATIENTS = {
  DNOA: {
    subscriberId: '825978894',
    firstName: 'SOPHIE',
    lastName: 'ROBINSON',
    dateOfBirth: '09/27/2016'
  },
  DentaQuest: {
    subscriberId: '710875473',
    firstName: 'Cason',
    lastName: 'Wright',
    dateOfBirth: '03/29/2016'
  },
  MetLife: {
    subscriberId: '635140654',
    firstName: 'AVERLY',
    lastName: 'TEDFORD',
    dateOfBirth: '06/15/2015'
  },
  Cigna: {
    subscriberId: 'U72997972',
    firstName: 'ELLIE',
    lastName: 'WILLIAMS',
    dateOfBirth: '11/14/2017'
  },
  DOT: {
    subscriberId: '916797559',
    firstName: 'MAURICE',
    lastName: 'BEREND',
    dateOfBirth: '12/16/1978'
  },
  DDINS: {
    subscriberId: 'U72997972',
    firstName: 'ESTELLE',
    lastName: 'MAZET',
    dateOfBirth: '11/15/1985'
  }
};

// Créer la base de données si elle n'existe pas
const dbPath = path.join(__dirname, 'monitoring.db');
const db = new sqlite3.Database(dbPath);

// Créer la table de monitoring
db.run(`
  CREATE TABLE IF NOT EXISTS monitor_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    portal TEXT NOT NULL,
    status TEXT NOT NULL,
    test_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    duration_ms INTEGER,
    error_message TEXT,
    details TEXT
  )
`);

// Fonction pour tester DNOA
async function testDNOA() {
  const startTime = Date.now();
  const service = new DNOAService();
  
  try {
    console.log('🔍 Testing DNOA...');
    await service.initialize(true, msg => console.log(`  DNOA: ${msg}`));
    
    const patient = TEST_PATIENTS.DNOA;
    // Convert date format from MM/DD/YYYY to YYYY-MM-DD for DNOA API
    const [month, day, year] = patient.dateOfBirth.split('/');
    const formattedPatient = {
      ...patient,
      dateOfBirth: `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
    };
    
    const data = await service.extractPatientData(
      formattedPatient,
      msg => console.log(`  DNOA: ${msg}`)
    );
    
    await service.close();
    
    const duration = Date.now() - startTime;
    
    // DNOA returns data directly, not wrapped in {success, data}
    if (data && data.benefits) {
      console.log('✅ DNOA: OK');
      return {
        portal: 'DNOA',
        status: 'up',
        duration_ms: duration,
        details: `Found ${data.benefits?.categories?.length || 0} benefit categories`
      };
    } else {
      console.log('❌ DNOA: Failed');
      return {
        portal: 'DNOA',
        status: 'down',
        duration_ms: duration,
        error_message: 'No data returned'
      };
    }
  } catch (error) {
    console.log('❌ DNOA: Error -', error.message);
    return {
      portal: 'DNOA',
      status: 'down',
      duration_ms: Date.now() - startTime,
      error_message: error.message
    };
  }
}

// Fonction pour tester DentaQuest
async function testDentaQuest() {
  const startTime = Date.now();
  const service = new DentaQuestService();
  
  try {
    console.log('🔍 Testing DentaQuest...');
    await service.initialize(true, msg => console.log(`  DQ: ${msg}`));
    
    const patient = TEST_PATIENTS.DentaQuest;
    const data = await service.extractPatientData(
      patient,
      msg => console.log(`  DQ: ${msg}`)
    );
    
    await service.close();
    
    const duration = Date.now() - startTime;
    
    // DentaQuest returns data directly, not wrapped in {success, data}
    if (data && data.claims) {
      console.log('✅ DentaQuest: OK');
      return {
        portal: 'DentaQuest',
        status: 'up',
        duration_ms: duration,
        details: `Found ${data.claims?.length || 0} claims`
      };
    } else {
      console.log('❌ DentaQuest: Failed');
      return {
        portal: 'DentaQuest',
        status: 'down',
        duration_ms: duration,
        error_message: 'No data returned'
      };
    }
  } catch (error) {
    console.log('❌ DentaQuest: Error -', error.message);
    return {
      portal: 'DentaQuest',
      status: 'down',
      duration_ms: Date.now() - startTime,
      error_message: error.message
    };
  }
}

// Fonction pour tester Cigna
async function testCigna() {
  const startTime = Date.now();
  const service = new CignaService();
  
  try {
    console.log('🔍 Testing Cigna...');
    
    // Initialize avec session persistante
    await service.initialize(true, msg => console.log(`  Cigna: ${msg}`));
    
    // Si on arrive ici, tenter une extraction avec le patient de test
    const patient = TEST_PATIENTS.Cigna;
    
    try {
      const data = await service.extractPatientData(
        patient,
        msg => console.log(`  Cigna: ${msg}`)
      );
      
      await service.close();
      const duration = Date.now() - startTime;
      
      if (data && data.summary) {
        console.log('✅ Cigna: OK');
        return {
          portal: 'Cigna',
          status: 'up',
          duration_ms: duration,
          details: `Found ${data.claims?.length || 0} claims, deductible: ${data.summary.deductible}`
        };
      } else {
        console.log('⚠️ Cigna: Degraded (login OK but extraction failed)');
        return {
          portal: 'Cigna',
          status: 'degraded',
          duration_ms: duration,
          details: 'Login successful but extraction failed'
        };
      }
    } catch (extractError) {
      await service.close();
      const duration = Date.now() - startTime;
      
      if (extractError.message.includes('OTP')) {
        console.log('⚠️ Cigna: Degraded (OTP required for full test)');
        return {
          portal: 'Cigna',
          status: 'degraded',
          duration_ms: duration,
          details: 'Login successful but OTP required for full test'
        };
      } else {
        console.log('⚠️ Cigna: Degraded (login OK, extraction error)');
        return {
          portal: 'Cigna',
          status: 'degraded',
          duration_ms: duration,
          details: `Login OK but error: ${extractError.message}`
        };
      }
    }
    
  } catch (error) {
    const duration = Date.now() - startTime;
    
    // Check if it's an OTP requirement issue
    if (error.message.includes('OTP') || 
        error.message.includes('verification required') ||
        error.message.includes('manual entry needed')) {
      console.log('⚠️ Cigna: OTP Required (not a failure)');
      return {
        portal: 'Cigna',
        status: 'otp_required',
        duration_ms: duration,
        details: 'OTP verification required - manual entry needed',
        error_message: 'Requires OTP - this is normal behavior'
      };
    }
    
    console.log('❌ Cigna: Error -', error.message);
    return {
      portal: 'Cigna',
      status: 'down',
      duration_ms: duration,
      error_message: error.message
    };
  }
}

// Fonction pour tester MetLife
async function testMetLife() {
  const startTime = Date.now();
  const service = new MetLifeService();
  
  try {
    console.log('🔍 Testing MetLife...');
    
    // Initialize et vérifier si session active
    await service.initialize(true, msg => console.log(`  ML: ${msg}`));
    
    // Si on arrive ici, vérifier si on a une session valide en testant avec un patient
    const patient = TEST_PATIENTS.MetLife;
    
    try {
      // Tenter une extraction avec le patient de test
      const result = await service.extractPatientData(
        patient.subscriberId,
        patient.lastName,
        patient.dateOfBirth,
        patient.firstName,
        msg => console.log(`  ML: ${msg}`)
      );
      
      await service.close();
      const duration = Date.now() - startTime;
      
      if (result.success && result.data) {
        console.log('✅ MetLife: OK (session active)');
        return {
          portal: 'MetLife',
          status: 'up',
          duration_ms: duration,
          details: `Found ${result.data.claims?.length || 0} claims (session active)`
        };
      } else {
        console.log('⚠️ MetLife: Degraded (login OK but extraction failed)');
        return {
          portal: 'MetLife',
          status: 'degraded',
          duration_ms: duration,
          details: 'Login successful but extraction failed'
        };
      }
    } catch (extractError) {
      // Si l'extraction échoue, c'est probablement à cause de l'OTP
      await service.close();
      const duration = Date.now() - startTime;
      
      if (extractError.message.includes('OTP')) {
        console.log('⚠️ MetLife: Degraded (OTP required for full test)');
        return {
          portal: 'MetLife',
          status: 'degraded',
          duration_ms: duration,
          details: 'Login successful but OTP required for full test'
        };
      } else {
        console.log('⚠️ MetLife: Degraded (login OK, extraction error)');
        return {
          portal: 'MetLife',
          status: 'degraded',
          duration_ms: duration,
          details: `Login OK but error: ${extractError.message}`
        };
      }
    }
    
  } catch (error) {
    const duration = Date.now() - startTime;
    
    // Si l'erreur mentionne OTP durant l'init, c'est que le login fonctionne mais OTP requis
    if (error.message.includes('OTP')) {
      console.log('⚠️ MetLife: Degraded (OTP required)');
      return {
        portal: 'MetLife',
        status: 'degraded',
        duration_ms: duration,
        details: 'OTP required - login flow working'
      };
    }
    
    console.log('❌ MetLife: Error -', error.message);
    return {
      portal: 'MetLife',
      status: 'down',
      duration_ms: duration,
      error_message: error.message
    };
  }
}

// Fonction pour tester DOT (smoke test only)
async function testDOT() {
  const startTime = Date.now();
  const service = new DOTService();
  
  try {
    console.log('🔍 Testing DOT...');
    await service.initialize(true, () => {}); // Silent logging
    
    // Smoke test: just check if session is valid and API can be created
    const isLoggedIn = await service.ensureLoggedIn(() => {});
    
    if (!isLoggedIn) {
      await service.close();
      const duration = Date.now() - startTime;
      console.log('❌ DOT: Need login');
      return {
        portal: 'DOT',
        status: 'down',
        duration_ms: duration,
        error_message: 'Session expired - login required'
      };
    }
    
    // Try to create API client to verify session works
    const path = require('path');
    try {
      const { createDotApi, closeApi } = require('./dot-extractor/dist/sdk/dotClient');
      const api = await createDotApi(path.join(__dirname, 'dot-extractor', 'dot-storage.json'));
      await closeApi(api);
      
      await service.close();
      const duration = Date.now() - startTime;
      console.log('✅ DOT: OK');
      return {
        portal: 'DOT',
        status: 'up',
        duration_ms: duration,
        details: 'Session valid and API accessible'
      };
    } catch (apiError) {
      await service.close();
      const duration = Date.now() - startTime;
      const isSessionError = apiError.message.includes('401') || apiError.message.includes('session') || apiError.message.includes('Bearer');
      
      if (isSessionError) {
        console.log('⚠️ DOT: Session expired');
        return {
          portal: 'DOT',
          status: 'degraded',
          duration_ms: duration,
          error_message: 'Session expired - needs refresh'
        };
      } else {
        console.log('❌ DOT: API error');
        return {
          portal: 'DOT',
          status: 'down',
          duration_ms: duration,
          error_message: apiError.message
        };
      }
    }
  } catch (error) {
    await service.close().catch(() => {});
    const duration = Date.now() - startTime;
    console.log('❌ DOT: Error -', error.message);
    return {
      portal: 'DOT',
      status: 'down',
      duration_ms: duration,
      error_message: error.message
    };
  }
}

// Fonction pour tester DDINS
async function testDDINS() {
  console.log('🔍 Testing DDINS...');
  const startTime = Date.now();
  const service = new DDINSService();

  try {
    await service.initialize(console.log.bind(null, '  DDINS:'));

    // Test avec le patient de test
    const testPatient = TEST_PATIENTS.DDINS;
    const result = await service.extractPatientData(
      testPatient,
      console.log.bind(null, '  DDINS:')
    );

    await service.close();
    const duration = Date.now() - startTime;

    if (result.eligibility || result.benefits) {
      const benefitCount = result.benefits ? result.benefits.length : 0;
      console.log(`✅ DDINS: OK - Found ${benefitCount} benefits`);
      return {
        portal: 'DDINS',
        status: 'up',
        duration_ms: duration,
        details: `Found ${benefitCount} benefits`
      };
    } else {
      console.log('⚠️ DDINS: Partial data');
      return {
        portal: 'DDINS',
        status: 'degraded',
        duration_ms: duration,
        details: 'Partial data retrieved'
      };
    }
  } catch (error) {
    await service.close().catch(() => {});
    const duration = Date.now() - startTime;

    if (error.message && error.message.includes('Session expired')) {
      console.log('⚠️ DDINS: Session expired');
      return {
        portal: 'DDINS',
        status: 'degraded',
        duration_ms: duration,
        error_message: 'Session expired - auto-login will retry'
      };
    } else {
      console.log('❌ DDINS: Error -', error.message);
      return {
        portal: 'DDINS',
        status: 'down',
        duration_ms: duration,
        error_message: error.message
      };
    }
  }
}

// Sauvegarder les résultats dans la base
function saveResult(result) {
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO monitor_results (portal, status, duration_ms, error_message, details)
       VALUES (?, ?, ?, ?, ?)`,
      [
        result.portal,
        result.status,
        result.duration_ms,
        result.error_message || null,
        result.details || null
      ],
      (err) => {
        if (err) reject(err);
        else resolve();
      }
    );
  });
}

// Helper pour timeout
const withTimeout = (promise, ms, label) => {
  return Promise.race([
    promise,
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error(`${label} timeout after ${ms}ms`)), ms)
    )
  ]);
};

// Fonction principale de test
async function runAllTests() {
  console.log('\n' + '='.repeat(50));
  console.log(`🏥 MONITORING RUN - ${new Date().toLocaleString()}`);
  console.log('='.repeat(50));
  console.log('🚀 Running all tests in PARALLEL...');
  
  // Exécuter tous les tests en parallèle avec timeout de 180 secondes (3 minutes)
  const [dnoaResult, dqResult, mlResult, cignaResult, dotResult, ddinsResult] = await Promise.all([
    withTimeout(testDNOA(), 180000, 'DNOA').catch(error => ({
      portal: 'DNOA',
      status: 'down',
      duration_ms: 0,
      error_message: error.message
    })),
    withTimeout(testDentaQuest(), 180000, 'DentaQuest').catch(error => ({
      portal: 'DentaQuest',
      status: 'down',
      duration_ms: 0,
      error_message: error.message
    })),
    withTimeout(testMetLife(), 180000, 'MetLife').catch(error => ({
      portal: 'MetLife',
      status: 'down',
      duration_ms: 0,
      error_message: error.message
    })),
    withTimeout(testCigna(), 180000, 'Cigna').catch(error => ({
      portal: 'Cigna',
      status: 'down',
      duration_ms: 0,
      error_message: error.message
    })),
    withTimeout(testDOT(), 180000, 'DOT').catch(error => ({
      portal: 'DOT',
      status: 'down',
      duration_ms: 0,
      error_message: error.message
    })),
    withTimeout(testDDINS(), 180000, 'DDINS').catch(error => ({
      portal: 'DDINS',
      status: 'down',
      duration_ms: 0,
      error_message: error.message
    }))
  ]);
  
  // Sauvegarder tous les résultats en parallèle
  await Promise.all([
    saveResult(dnoaResult),
    saveResult(dqResult),
    saveResult(mlResult),
    saveResult(cignaResult),
    saveResult(dotResult),
    saveResult(ddinsResult)
  ]);
  
  const results = [dnoaResult, dqResult, mlResult, cignaResult, dotResult, ddinsResult];
  
  // Résumé
  console.log('\n📊 SUMMARY:');
  results.forEach(r => {
    const iconMap = { up: '✅', degraded: '⚠️', otp_required: '🔐', down: '❌' };
    const icon = iconMap[r.status] || '❓';
    console.log(`  ${icon} ${r.portal}: ${r.status.toUpperCase()} (${r.duration_ms}ms)`);
  });
  
  console.log('='.repeat(50) + '\n');
  
  return results;
}

// Récupérer le dernier statut pour l'API
function getLatestStatus() {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT portal, status, test_time, duration_ms, error_message, details
       FROM monitor_results
       WHERE id IN (
         SELECT MAX(id) FROM monitor_results GROUP BY portal
       )
       ORDER BY portal`,
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      }
    );
  });
}

// Récupérer l'historique
function getHistory(hours = 24) {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT * FROM monitor_results
       WHERE test_time > datetime('now', '-${hours} hours')
       ORDER BY test_time DESC`,
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      }
    );
  });
}

// Si lancé directement, faire un test immédiat
if (require.main === module) {
  // SÉCURITÉ: Empêcher l'exécution locale pour protéger les sessions de prod
  if (!process.env.RENDER && !process.env.ALLOW_LOCAL_MONITOR) {
    console.error('❌ ERREUR DE SÉCURITÉ: Ne pas exécuter monitor.js localement !');
    console.error('');
    console.error('⚠️  L\'exécution locale peut invalider les sessions de production.');
    console.error('');
    console.error('Utilisez plutôt :');
    console.error('  • Interface web : https://dental-portal-extractor.onrender.com/monitor?key=demo2024secure');
    console.error('  • API : curl "https://dental-portal-extractor.onrender.com/api/monitor/test?key=demo2024secure"');
    console.error('');
    console.error('Pour forcer l\'exécution locale (DANGEREUX) :');
    console.error('  ALLOW_LOCAL_MONITOR=true node monitor.js');
    console.error('');
    process.exit(1);
  }
  
  console.log('🚀 Running immediate test...');
  runAllTests().then(() => {
    console.log('✅ Test complete');
    process.exit(0);
  }).catch(err => {
    console.error('❌ Test failed:', err);
    process.exit(1);
  });
}

// Exporter pour utilisation dans server.js
module.exports = {
  runAllTests,
  getLatestStatus,
  getHistory,
  TEST_PATIENTS
};
