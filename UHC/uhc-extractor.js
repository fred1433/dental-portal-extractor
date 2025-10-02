#!/usr/bin/env node
/* eslint-disable no-console */
'use strict';

/**
 * UHC – Extractor consolidé (tout-en-un)
 * - Remplace: UHC/uhc_extractor_final.py + UHC/uhc-service.js + UHC/uhc-complete-solution.js
 * - Dépendances: `npm i playwright`
 * - Chrome stable: `npx playwright install chrome`
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// =========================
// Configuration & Helpers
// =========================

const START_URL = 'https://secure.uhcdental.com/content/dental-benefits-provider/en/secure/search-landing.html';

// Configuration du navigateur (valeurs fixes)
const USE_CHROME   = true;  // Utilise Chrome au lieu de Chromium
const HEADLESS     = false; // Mode visible pour permettre l'OTP manuel
const KEEP_OPEN    = false; // Ne pas garder le navigateur ouvert après extraction

// Utils
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
function ensureDir(dir) { if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); }
function slugify(s) { return String(s).toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '').replace(/_+/g, '_').replace(/^_+|_+$/g, ''); }
function ts() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}
function toAmericanDate(dateString) {
  if (!dateString) return '';
  if (dateString.includes('/')) return dateString;
  const parts = dateString.split('-');
  if (parts.length !== 3) return dateString;
  const [year, month, day] = parts;
  return `${String(month).padStart(2,'0')}/${String(day).padStart(2,'0')}/${String(year)}`;
}
function computeDates() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());

  const todayMMDDYYYY = `${mm}/${dd}/${yyyy}`;
  const todayYMD = `${yyyy}-${mm}-${dd}`;
  const todayYMDSLASH = `${yyyy}/${mm}/${dd}`;

  const past = new Date(d);
  past.setFullYear(past.getFullYear() - 5);
  const pyyyy = past.getFullYear();
  const pmm = pad(past.getMonth() + 1);
  const pdd = pad(past.getDate());
  const fromDateYMD = `${pyyyy}-${pmm}-${pdd}`;

  return { todayMMDDYYYY, todayYMD, todayYMDSLASH, fromDateYMD };
}

// =========================================
// Injection du code "uhc-complete-solution"
// =========================================

async function injectExtractionScript(page, dates) {
  const already = await page.evaluate(() => typeof window.extractUHCPatientComplete === 'function');
  if (already) return;

  await page.evaluate((datesArg) => {
    (function () {
      console.log('🎯 UHC COMPLETE SOLUTION - Enhanced with utilizationHistory');

      const TODAY_MMDDYYYY = datesArg.todayMMDDYYYY;
      const TODAY_YMD = datesArg.todayYMD;
      const TODAY_YMD_SLASH = datesArg.todayYMDSLASH;
      const FROMDATE_YMD = datesArg.fromDateYMD;

      class UHCCompleteSolution {
        constructor() { this.debug = false; }

        // STEP 1
        async getMemberContrivedKey(dob, memberId) {
          console.log(`📡 Step 1: Getting memberContrivedKey for ${memberId}...`);
          const payload = [
            'applicationId=DBP',
            `dateOfBirth=${dob}`,
            'roleId=DBP',
            'maximumConsumerRecordCount=50',
            'coverageTypeCode=37',
            'timelineIndicator=2',
            'sourceCodeIndicator=1',
            `asOfDate=${TODAY_MMDDYYYY}`,
            'familyIndicator=I',
            `searchId=${memberId}`
          ].join('&');

          const response = await fetch('/apps/dental/member', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/xml;',
              'Accept': 'application/json, text/plain, */*',
              'X-Requested-With': 'XMLHttpRequest'
            },
            body: payload
          });
          if (!response.ok) throw new Error(`Member endpoint failed: ${response.status}`);

          const data = await response.json();
          const consumer = data.result?.consumers?.[0];
          if (!consumer) throw new Error('No consumer data found');

          const memberContrivedKey = consumer.demographics.consumerId;
          console.log(`✅ MemberContrivedKey: ${memberContrivedKey}`);
          return { memberContrivedKey, memberData: consumer };
        }

        // STEP 2
        async getProductId(memberContrivedKey) {
          console.log(`📡 Step 2: Getting REAL productId for ${memberContrivedKey}...`);
          const payload = [
            `memberContrivedKey=${memberContrivedKey}`,
            'facetsIdentity=FXIGUESTP',
            `startDate=${TODAY_YMD}`,
            `stopDate=${TODAY_YMD}`,
            'requestType=P',
            'lapAndHcrInfoNeeded=Y',
            'providerId=000014047813'
          ].join('&');

          const response = await fetch('/apps/dental/eligsummary', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/xml;',
              'Accept': 'application/json, text/plain, */*',
              'X-Requested-With': 'XMLHttpRequest'
            },
            body: payload
          });
          if (!response.ok) throw new Error(`Eligsummary failed: ${response.status}`);

          const data = await response.json();

          let productId = null;
          const memberDetails = data.result?.memberDetails?.[0];
          if (memberDetails?.eligibility?.[0]?.product?.codeValue) {
            productId = memberDetails.eligibility[0].product.codeValue;
          }
          if (!productId) {
            const responseStr = JSON.stringify(data);
            const matches = responseStr.match(/[A-Z][0-9]{7}/g);
            if (matches) productId = matches[0];
          }
          if (!productId) throw new Error('ProductId not found in eligsummary response');

          console.log(`✅ REAL ProductId: ${productId}`);
          return { productId, eligibilityData: data };
        }

        // STEP 3
        async getBenefitsData(memberContrivedKey, productId) {
          console.log(`📡 Step 3: Getting benefits for productId ${productId}...`);

          const params = new URLSearchParams({
            productId: productId,
            effectiveDate: TODAY_YMD_SLASH,
            providerType: 'I',
            memberContrivedKey: memberContrivedKey,
            accumulatorNumber: '0',
            categoryId: '*',
            procedureCode: '*',
            descriptionRequired: 'Y'
          });

          const response = await fetch(`/apps/dental/benefitsummary?${params}`);
          if (!response.ok) throw new Error(`Benefits API failed: ${response.status}`);

          const data = await response.json();
          const member = data.result?.dentalBenefitsAndAccums?.member;
          if (!member) throw new Error('No member benefits data found');

          console.log('✅ Benefits data retrieved');
          return data;
        }

        // STEP 4
        async getUtilizationHistory(memberContrivedKey, productId) {
          console.log('📡 Step 4: Getting utilization history (detailed procedures)...');

          const params = new URLSearchParams({
            facetsIdentity: 'FXIGUEST',
            memberContrivedKey: memberContrivedKey,
            fromDate: FROMDATE_YMD,
            toDate: TODAY_YMD,
            productId: productId
          });

          const response = await fetch(`/apps/dental/utilizationHistory?${params}`);
          if (!response.ok) throw new Error(`UtilizationHistory failed: ${response.status}`);

          const data = await response.json();
          const serviceHistory = data.result?.dentalServiceHistory;
          if (!serviceHistory) throw new Error('No service history data found');

          const procedureCount = serviceHistory.procedures?.length || 0;
          console.log(`✅ Utilization history: ${procedureCount} detailed procedures`);
          return data;
        }

        // MAIN
        async extractPatient(dob, memberId, patientName = 'Patient') {
          console.log(`\n🚀 UHC Complete Extraction (4-step) for ${patientName}`);
          console.log(`📋 Input: DOB "${dob}", Member ID "${memberId}"`);
          console.log('✅ Method: Browser console JavaScript (4-step workflow)');

          try {
            const memberResult    = await this.getMemberContrivedKey(dob, memberId);
            const eligibilityResult = await this.getProductId(memberResult.memberContrivedKey);
            const benefitsData    = await this.getBenefitsData(memberResult.memberContrivedKey, eligibilityResult.productId);
            const utilizationData = await this.getUtilizationHistory(memberResult.memberContrivedKey, eligibilityResult.productId);

            const member = benefitsData.result.dentalBenefitsAndAccums.member;
            const serviceHistory = utilizationData.result.dentalServiceHistory;

            const result = {
              success: true,
              patient: {
                name: `${member.patientName?.firstName} ${member.patientName?.lastName}`,
                dob: member.birthDate || dob,
                memberId: memberId,
                memberContrivedKey: memberResult.memberContrivedKey,
                productId: eligibilityResult.productId,
                relationship: serviceHistory.memberRelationship
              },
              benefits: {
                annualMax: member.planLevelBenefits?.[0]?.planLevelLimitInfo?.limitMemberMaxAmt,
                usedAmount: member.planLevelBenefits?.[0]?.planLevelLimitInfo?.currYearLimitMemberAmtSatisfied || '0',
                planName: member.productId?.codeDesc,
                groupName: member.groupName,
                eligibilityStatus: member.eligibilityIndicator,
                effectiveDate: member.memberEligibilityEffectiveDate
              },
              procedures: {
                totalCount: serviceHistory.procedures?.length || 0,
                details: serviceHistory.procedures || [],
                categories: this.categorizeProcedures(serviceHistory.procedures || []),
                summary: this.summarizeProcedures(serviceHistory.procedures || [])
              },
              extraction: {
                method: 'UHC_COMPLETE_SOLUTION',
                steps: 4,
                inputRequired: ['dob', 'memberId'],
                authenticated: 'browser_session',
                enhanced: true,
                procedureDataIncluded: true
              },
              rawData: {
                memberData: memberResult.memberData,
                eligibilityData: eligibilityResult.eligibilityData,
                benefitsData: benefitsData,
                utilizationData: utilizationData
              }
            };

            console.log('\n🎉 COMPLETE EXTRACTION SUCCESSFUL!');
            console.log('══════════════════════════════════════');
            console.log(`👤 Patient: ${result.patient.name}`);
            console.log(`💰 Annual Max: ${result.benefits.annualMax || 'N/A'}`);
            console.log(`💸 Used: ${result.benefits.usedAmount}`);
            console.log(`📋 Plan: ${result.benefits.planName}`);
            console.log(`🏥 Group: ${result.benefits.groupName}`);
            console.log(`🔑 ProductId: ${result.patient.productId}`);
            console.log(`🛠️ Procedures: ${result.procedures.totalCount} detailed procedures`);
            console.log(`📊 Categories: ${Object.keys(result.procedures.categories).length} different types`);
            console.log('══════════════════════════════════════');

            return result;
          } catch (error) {
            console.error(`❌ Complete extraction failed: ${error.message}`);
            return {
              success: false,
              error: error.message,
              patient: { name: patientName, dob, memberId },
              extraction: {
                method: 'UHC_COMPLETE_SOLUTION',
                steps: 4,
                inputRequired: ['dob', 'memberId'],
                authenticated: 'browser_session',
                enhanced: true,
                failed: true
              }
            };
          }
        }

        categorizeProcedures(procedures) {
          const categories = {};
          procedures.forEach(proc => {
            const category = proc.procedureCategory || 'unknown';
            if (!categories[category]) categories[category] = [];
            categories[category].push({
              code: proc.procedure?.codeValue || 'N/A',
              description: proc.procedure?.codeDesc || 'N/A',
              inNetworkFreq: proc.inNetworkFrequency || 'N/A',
              outNetworkFreq: proc.outOfNetworkFrequency || 'N/A',
              ehb: proc.ehbIndicator || 'N/A'
            });
          });
          return categories;
        }

        summarizeProcedures(procedures) {
          const ehbCount = procedures.filter(p => p.ehbIndicator === 'Y').length;
          const categories = [...new Set(procedures.map(p => p.procedureCategory))];
          return {
            totalProcedures: procedures.length,
            ehbProcedures: ehbCount,
            nonEhbProcedures: procedures.length - ehbCount,
            categoriesCount: categories.length,
            categories: categories,
            hasAgeLimit: procedures.filter(p => p.ageLimit).length,
            hasAlternateBenefit: procedures.filter(p => p.alternateBenefit).length
          };
        }
      }

      // Expose dans la page
      window.uhcCompleteSolution = new UHCCompleteSolution();
      window.extractUHCPatientComplete = async (dob, memberId, name = 'Patient') => {
        return await window.uhcCompleteSolution.extractPatient(dob, memberId, name);
      };

      console.log('\n✅ UHC Complete Solution Ready!');
      console.log('🎯 Enhanced 4-Step Workflow: /member → /eligsummary → /benefitsummary → /utilizationHistory');
      console.log('📋 Requirements: Only Member ID + Date of Birth');
      console.log('📋 Usage: await extractUHCPatientComplete("MM/DD/YYYY", "memberID", "Name")');
    })();
  }, dates);
}

// =========================
// Authentification & Setup
// =========================

async function ensureLoggedIn(page, username, password) {
  const url = page.url();
  if (url.includes('search-landing') || url.includes('postloginhomescreen')) {
    console.log('✅ UHC session already authenticated');
    return true;
  }

  console.log('🔐 Login required...');

  if (!username || !password) {
    throw new Error('UHC credentials missing. Set UHC_USERNAME and UHC_PASSWORD environment variables.');
  }

  try {
    await page.waitForLoadState('domcontentloaded', { timeout: 60_000 });

    // Username → Continue
    await page.getByTestId('username').fill(username);
    await page.getByRole('button', { name: 'Continue' }).click();
    await sleep(2000);

    // Password → Continue
    await page.getByTestId('login-pwd').fill(password);
    await page.getByRole('button', { name: 'Continue' }).click();
    await sleep(2000);

    // OTP (manuel)
    const smsButton = page.getByRole('button', { name: 'Via Text Message' });
    if (await smsButton.isVisible().catch(() => false)) {
      await smsButton.click();
      console.log('\n⏳ WAITING FOR OTP...');
      console.log('   Entrez le code manuellement dans le navigateur.');
    }

    // Attendre jusqu'à 5 minutes
    await page.waitForFunction(() =>
      window.location.href.includes('search-landing') || window.location.href.includes('postloginhomescreen'), { timeout: 300_000 });

    console.log('✅ Logged in successfully!');
    return true;
  } catch (err) {
    console.error(`❌ Login failed: ${err.message}`);
    throw err;
  }
}

// =========================
// Extraction par patient
// =========================

async function extractOne(page, dates, { name, dob, memberId }) {
  const dobForPortal = toAmericanDate(dob);
  console.log(`\n👤 Extracting ${name}...`);
  console.log(`   DOB: ${dobForPortal}, Member ID: ${memberId}`);

  try {
    await injectExtractionScript(page, dates);

    const result = await page.evaluate(
      ({ dob, memberId, name }) => window.extractUHCPatientComplete(dob, memberId, name),
      { dob: dobForPortal, memberId, name: name || 'Patient' }
    );

    if (result && result.success) {
      console.log(`   ✅ Success! ${result.procedures?.totalCount || 0} procedures found`);

      ensureDir(DATA_DIR);
      const filename = `${slugify(name)}_${ts()}.json`;
      const filepath = path.join(DATA_DIR, filename);
      fs.writeFileSync(filepath, JSON.stringify(result, null, 2));
      console.log(`   💾 Saved to ${filepath}`);

      return result;
    } else {
      const error = result?.error || 'Unknown error';
      console.log(`   ❌ Failed: ${error}`);
      return null;
    }
  } catch (e) {
    console.log(`   ⚠️ Extraction error: ${e.message}`);
    return null;
  }
}

// =========================
// Service Class (for module usage)
// =========================

class UHCService {
  constructor(credentials = {}) {
    this.credentials = credentials;
    this.context = null;
    this.page = null;
    this.broadcastLog = () => {};
    this.userDataDir = path.resolve(process.cwd(), '.uhc-chrome-profile');
    this.dataDir = path.resolve(process.cwd(), 'UHC', 'data');
  }

  async initialize(headless = false, broadcastLog = () => {}) {
    this.broadcastLog = broadcastLog;
    broadcastLog('🦷 UHC Service initialized');

    ensureDir(this.userDataDir);

    const launchOptions = {
      headless: false, // Always visible for OTP
      args: ['--disable-blink-features=AutomationControlled']
    };
    if (USE_CHROME) launchOptions.channel = 'chrome';

    this.context = await chromium.launchPersistentContext(this.userDataDir, launchOptions);
    this.page = this.context.pages()[0] || await this.context.newPage();

    // Forward page logs - only keep relevant extraction messages
    this.page.on('console', (msg) => {
      const text = msg.text();
      // Only forward our extraction logs and important errors
      if (text.includes('🎯') || text.includes('📡') || text.includes('✅') ||
          text.includes('❌') || text.includes('🚀 UHC') || text.includes('📋') ||
          text.includes('🎉') || text.includes('══════') || text.includes('💰') ||
          text.includes('💸') || text.includes('🏥') || text.includes('🔑') ||
          text.includes('🛠️') || text.includes('📊') || text.includes('👤')) {
        this.broadcastLog(text);
      }
      // Log real errors (but not 404s from UHC's broken resources)
      else if (msg.type() === 'error' && !text.includes('404') && !text.includes('Failed to load resource')) {
        this.broadcastLog(`[ERROR] ${text}`);
      }
    });

    // Navigate to UHC
    this.broadcastLog('📍 Navigating to UHC...');
    await this.page.goto(START_URL, { timeout: 120_000 }).catch(() => {});
    await sleep(3000);

    // Login with credentials
    const username = this.credentials?.username || process.env.UHC_USERNAME || 'payorportal4771';
    const password = this.credentials?.password || process.env.UHC_PASSWORD || 'SDBcon$istency$2026';

    await ensureLoggedIn(this.page, username, password);
  }

  async extractPatientData(patient, broadcastLog = () => {}) {
    if (broadcastLog) this.broadcastLog = broadcastLog;

    try {
      // Format date from YYYY-MM-DD to MM/DD/YYYY
      let formattedDob = patient.dateOfBirth;
      if (patient.dateOfBirth && patient.dateOfBirth.includes('-')) {
        const [year, month, day] = patient.dateOfBirth.split('-');
        formattedDob = `${month}/${day}/${year}`;
      }

      const patientName = patient.firstName && patient.lastName
        ? `${patient.firstName} ${patient.lastName}`
        : `Patient ${patient.subscriberId}`;

      broadcastLog(`📊 Extracting UHC data for ${patientName}`);
      broadcastLog(`📅 Member ID: ${patient.subscriberId}, DOB: ${formattedDob}`);

      const dates = computeDates();
      const result = await extractOne(this.page, dates, {
        name: patientName,
        dob: formattedDob,
        memberId: patient.subscriberId
      });

      if (!result) {
        throw new Error('Extraction failed');
      }

      // Transform data to match expected format
      const transformedResult = {
        summary: {
          patientName: result.patient?.name || 'N/A',
          memberId: result.patient?.memberId || patient.subscriberId,
          planMaximum: result.benefits?.annualMax || 'N/A',
          maximumUsed: result.benefits?.usedAmount || '0',
          maximumRemaining: result.benefits?.annualMax ?
            (parseFloat(result.benefits.annualMax.replace(/[^0-9.]/g, '')) -
             parseFloat(result.benefits.usedAmount.replace(/[^0-9.]/g, ''))).toFixed(2) : 'N/A',
          deductible: 'N/A',
          deductibleMet: 'N/A',
          planName: result.benefits?.planName || 'N/A',
          groupName: result.benefits?.groupName || 'N/A'
        },
        procedures: result.procedures || {},
        patient: result.patient || {},
        benefits: result.benefits || {},
        rawData: result.rawData || {},
        timestamp: new Date().toISOString()
      };

      broadcastLog('✅ UHC data extraction complete');
      return transformedResult;

    } catch (error) {
      broadcastLog(`❌ UHC extraction error: ${error.message}`);
      throw error;
    }
  }

  async close() {
    if (this.context) {
      await this.context.close();
      this.context = null;
      this.page = null;
    }
  }
}

// ==============
// CLI Mode
// ==============

// Dossiers (profil persistant et data)
const USER_DATA_DIR = path.resolve(process.cwd(), '.uhc-chrome-profile');
const DATA_DIR = path.resolve(process.cwd(), 'UHC', 'data');

// Only run CLI mode if this script is executed directly
if (require.main === module) {
  (async () => {
    // Default patients for CLI mode
    const PATIENTS = [
      { name: 'Zia Morgan',   dob: '09/17/2019', memberId: '132236890' },
      { name: 'Jace Wallace', dob: '03/11/2024', memberId: '701558040' },
    ];

    // Identifiants pour le mode CLI
    const UHC_USERNAME = process.env.UHC_USERNAME || 'payorportal4771';
    const UHC_PASSWORD = process.env.UHC_PASSWORD || 'SDBcon$istency$2026';

    console.log('🚀 UHC Data Extractor - Single File Version');
    console.log(`   Profile: ${USER_DATA_DIR}`);
    console.log(`   Browser: ${USE_CHROME ? 'Chrome' : 'Chromium'} | headless=${HEADLESS}`);

    ensureDir(USER_DATA_DIR);

    const launchOptions = {
      headless: HEADLESS,
      args: ['--disable-blink-features=AutomationControlled']
    };
    if (USE_CHROME) launchOptions.channel = 'chrome';

    const context = await chromium.launchPersistentContext(USER_DATA_DIR, launchOptions);
    const page = context.pages()[0] || await context.newPage();

    // Forward only relevant extraction logs from the page
    page.on('console', (msg) => {
      const text = msg.text();
      // Only show our extraction messages
      if (text.includes('🎯') || text.includes('📡') || text.includes('✅') ||
          text.includes('❌') || text.includes('🚀 UHC') || text.includes('📋') ||
          text.includes('🎉') || text.includes('══════') || text.includes('💰') ||
          text.includes('💸') || text.includes('🏥') || text.includes('🔑') ||
          text.includes('🛠️') || text.includes('📊') || text.includes('👤')) {
        console.log(`🖥️ ${text}`);
      }
    });

    try {
      // Aller sur la page d'accueil UHC
      console.log('\n📍 Navigating to UHC...');
      await page.goto(START_URL, { timeout: 120_000 }).catch(() => {});
      await sleep(3000);

      await ensureLoggedIn(page, UHC_USERNAME, UHC_PASSWORD);

      // Datas
      const dates = computeDates();

      // Extraction
      const results = [];
      for (const patient of PATIENTS) {
        const r = await extractOne(page, dates, patient);
        if (r) results.push(r);
      }

      // Summary
      console.log('\n' + '='.repeat(50));
      console.log('📊 EXTRACTION SUMMARY');
      console.log('='.repeat(50));
      for (const r of results) {
        console.log(`\n👤 ${r.patient.name}`);
        console.log(`   Plan: ${r.benefits.planName}`);
        console.log(`   Procedures: ${r.procedures.totalCount}`);
        console.log(`   Annual Max: ${r.benefits.annualMax || 'N/A'}`);
      }

      // Exit codes (compat Python)
      let exitCode;
      if (results.length === PATIENTS.length) {
        console.log('\n🎉 FULL SUCCESS: All patients extracted!');
        exitCode = 0;
      } else if (results.length > 0) {
        console.log('\n⚠️ PARTIAL SUCCESS');
        exitCode = 1;
      } else {
        console.log('\n❌ FAILED: No patients extracted');
        exitCode = 2;
      }

      if (KEEP_OPEN) {
        console.log('💡 Browser will stay open for 30 seconds...');
        await sleep(30_000);
      } else {
        console.log('🔒 Closing browser in 3 seconds...');
        await sleep(3_000);
      }

      await context.close();
      console.log('👋 Browser closed');
      process.exit(exitCode);
    } catch (err) {
      console.error(`\n💥 Fatal error: ${err.message}`);
      try { await context.close(); } catch {}
      process.exit(2);
    }
  })();
}

// Export for module usage
module.exports = UHCService;