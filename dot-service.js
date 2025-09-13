/**
 * DOT Service Wrapper
 * Provides a uniform interface matching other portal services
 */

const path = require('path');
const fs = require('fs');

// Import the compiled JavaScript from dot-extractor
const { extractDotData } = require('./dot-extractor/dist');

const SESSION_DIR = path.join(__dirname, '.dot-session');
const STORAGE_STATE_FILE = path.join(SESSION_DIR, 'storageState.json');
const DOT_STORAGE_FILE = path.join(__dirname, 'dot-extractor', 'dot-storage.json');

class DOTService {
  constructor() {
    this.browser = null;
    this.context = null;
    this.page = null;
    this.headless = true;
    this.log = console.log;
    this.isFirstRun = !fs.existsSync(SESSION_DIR);
  }

  async initialize(headless = true, onLog = console.log) {
    this.headless = headless;
    this.log = onLog;
    
    onLog('🚀 Initializing DOT service...');
    
    if (this.isFirstRun) {
      onLog('🆕 First run - Creating session directory');
      fs.mkdirSync(SESSION_DIR, { recursive: true });
    } else {
      onLog('✅ Using existing session');
    }

    // Restore session from environment variable if available (for production)
    if (process.env.DOT_SESSION_B64 && !fs.existsSync(DOT_STORAGE_FILE)) {
      try {
        const sessionData = Buffer.from(process.env.DOT_SESSION_B64, 'base64').toString('utf-8');
        fs.writeFileSync(DOT_STORAGE_FILE, sessionData);
        onLog('✅ DOT session restored from environment variable');
      } catch (error) {
        onLog(`⚠️ Failed to restore session from env: ${error.message}`);
      }
    }

    onLog('✅ DOT service initialized');
  }

  async saveSession(onLog = console.log) {
    // Copy dot-storage.json to our session directory
    if (fs.existsSync(DOT_STORAGE_FILE)) {
      fs.copyFileSync(DOT_STORAGE_FILE, STORAGE_STATE_FILE);
      onLog('💾 Session saved');
    }
  }

  async ensureLoggedIn(onLog = console.log) {
    onLog('🔐 Checking DOT login status...');
    
    // Check if storage file exists
    if (!fs.existsSync(DOT_STORAGE_FILE)) {
      onLog('❌ No DOT session found');
      onLog('📝 Please run manual login:');
      onLog('   cd dot-extractor && npm run login');
      onLog('   OR set DOT_SESSION_B64 environment variable');
      return false;
    }
    
    // Check if session is recent (optional - could validate expiry)
    const stats = fs.statSync(DOT_STORAGE_FILE);
    const ageInDays = (Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60 * 24);
    
    if (ageInDays > 30) {
      onLog(`⚠️ Session is ${Math.floor(ageInDays)} days old - may need refresh`);
    }
    
    onLog('✅ DOT session present');
    return true;
  }

  async extractPatientData(patient, onLog = console.log) {
    const logWrapper = (message) => {
      if (typeof onLog === 'function') {
        onLog(message);
      }
    };
    
    try {
      logWrapper(`🔍 Extracting DOT data for ${patient.firstName} ${patient.lastName}`);
      
      // Map patient format to DOT extractor format
      const extractOptions = {
        memberId: patient.subscriberId || patient.memberId,
        firstName: patient.firstName,
        lastName: patient.lastName,
        birthDate: this.formatDateForDOT(patient.dateOfBirth),
        allFamily: patient.allFamily !== false, // Default to true
        fromDate: patient.fromDate,
        toDate: patient.toDate,
        storagePath: DOT_STORAGE_FILE // Pass the correct path to the session file
      };
      
      // Call the TypeScript extractor
      const data = await extractDotData(extractOptions);
      
      // Transform to match expected format
      const result = {
        patient: {
          ...patient,
          subscriberId: extractOptions.memberId
        },
        extractionDate: new Date().toISOString(),
        portal: 'DOT',
        searchData: data.searchData,
        subscriber: data.subscriber,
        dependents: data.dependents,
        summary: this.generateSummary(data)
      };
      
      logWrapper(`✅ DOT extraction complete - ${result.summary.totalClaims} claims found`);
      
      return result;
      
    } catch (error) {
      logWrapper(`❌ DOT extraction error: ${error.message}`);
      
      // Check if it's a session error
      if (error.message.includes('401') || error.message.includes('session') || error.message.includes('Bearer')) {
        logWrapper('💡 Session may have expired. Please run: cd dot-extractor && npm run login');
      }
      
      throw error;
    }
  }

  formatDateForDOT(dateStr) {
    // Convert from various formats to MM/DD/YYYY
    if (!dateStr) return '';
    
    // If already in MM/DD/YYYY format, return as is
    if (dateStr.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
      return dateStr;
    }
    
    // Convert from YYYY-MM-DD
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [year, month, day] = dateStr.split('-');
      return `${month}/${day}/${year}`;
    }
    
    return dateStr;
  }

  generateSummary(data) {
    const summary = {
      totalClaims: 0,
      totalProcedures: 0,
      cdtCodes: new Set(),
      benefitsAvailable: false,
      familyMembers: 0
    };
    
    // Count subscriber claims
    if (data.subscriber) {
      summary.totalClaims += data.subscriber.claims?.length || 0;
      summary.benefitsAvailable = !!data.subscriber.benefitsParsed;
      
      // Count CDT codes
      data.subscriber.claims?.forEach(claim => {
        if (claim.detail?.lineItems) {
          claim.detail.lineItems.forEach(item => {
            if (item.procedureCode) {
              summary.cdtCodes.add(item.procedureCode);
              summary.totalProcedures++;
            }
          });
        }
      });
    }
    
    // Count dependent claims
    if (data.dependents) {
      summary.familyMembers = data.dependents.length;
      data.dependents.forEach(dep => {
        summary.totalClaims += dep.claims?.length || 0;
        
        dep.claims?.forEach(claim => {
          if (claim.detail?.lineItems) {
            claim.detail.lineItems.forEach(item => {
              if (item.procedureCode) {
                summary.cdtCodes.add(item.procedureCode);
                summary.totalProcedures++;
              }
            });
          }
        });
      });
    }
    
    summary.uniqueCDTCodes = Array.from(summary.cdtCodes).sort();
    summary.cdtCodesCount = summary.cdtCodes.size;
    delete summary.cdtCodes; // Remove the Set object
    
    return summary;
  }

  async close() {
    // Save session before closing
    await this.saveSession(this.log);
    
    if (this.context) {
      await this.context.close();
    }
    if (this.browser) {
      await this.browser.close();
    }
    
    this.log('🔒 DOT service closed');
  }
}

module.exports = DOTService;