/**
 * DOT Service Wrapper
 * Provides a uniform interface matching other portal services
 */

const path = require('path');
const fs = require('fs');

// Import the compiled JavaScript from dot-extractor itself
const { extractDotData, ensureValidSession } = require('./dist');

const SESSION_DIR = path.join(__dirname, '.dot-session');
const STORAGE_STATE_FILE = path.join(SESSION_DIR, 'storageState.json');
const DOT_STORAGE_FILE = path.join(__dirname, 'dot-storage.json');

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
    
    try {
      // Use the new ensureValidSession function that includes auto-login
      const sessionValid = await ensureValidSession(DOT_STORAGE_FILE);
      
      if (sessionValid) {
        onLog('✅ DOT session valid');
        return true;
      } else {
        onLog('❌ No valid DOT session and auto-login not available');
        onLog('📝 Please run one of these commands:');
        onLog('   cd dot-extractor && npm run login:assist  (recommended - assisted login)');
        onLog('   cd dot-extractor && npm run login:auto    (automated login)');
        onLog('   cd dot-extractor && npm run login         (manual login)');
        onLog('   OR set DOT_USERNAME and DOT_PASSWORD environment variables');
        return false;
      }
    } catch (error) {
      onLog(`⚠️ Session validation error: ${error.message}`);
      return false;
    }
  }

  async extractPatientData(patient, onLog = console.log, options = {}) {
    const logWrapper = (message) => {
      if (typeof onLog === 'function') {
        onLog(message);
      }
    };
    
    const originalConsoleLog = console.log;
    
    try {
      // Afficher immédiatement les premiers logs
      logWrapper(`🔍 Extracting DOT data for ${patient.firstName} ${patient.lastName}`);
      logWrapper(`📋 Patient ID: ${patient.subscriberId}`);
      logWrapper(`🔐 Checking DOT session...`);
      
      // Check session and auto-login if needed
      const sessionValid = await this.ensureLoggedIn(logWrapper);
      if (!sessionValid) {
        throw new Error('DOT session invalid - login required');
      }
      
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
      
      logWrapper(`🚀 Initializing DOT API client...`);
      logWrapper(`⏳ Capturing authentication token (this may take a few seconds)...`);
      
      // Only hijack console.log if not in monitor mode
      if (!options.monitorMode) {
        console.log = (message) => {
          if (typeof message === 'string') {
            // Filtrer ou reformater certains messages
            if (message.includes('Bearer token captured')) {
              originalConsoleLog('  DOT: ✅ Authentication successful');
            } else if (message.includes('API client ready')) {
              originalConsoleLog('  DOT: ✅ API client ready');
            } else if (message.includes('Searching for member')) {
              // Ne pas dupliquer ce message
              return;
            } else if (message.includes('benefitProgramOid')) {
              // Masquer les détails techniques
              return;
            } else if (message.includes('Variant A failed')) {
              // Masquer les détails d'implémentation
              return;
            } else if (message.includes('person MTU')) {
              // Simplifier les IDs hashés
              const simplified = message.replace(/person MTU[A-Za-z0-9]+\.\.\./, 'this family member...');
              originalConsoleLog('  DOT: ' + simplified);
            } else if (!message.includes('Bearer token')) {
              originalConsoleLog('  DOT: ' + message);
            }
          } else {
            originalConsoleLog(message);
          }
        };
      }
      
      // Call the TypeScript extractor
      const data = await extractDotData(extractOptions);
      
      // Transform to match expected format
      const subscriberInfo = data.searchData?.subscribers?.[0];
      const patientName = subscriberInfo ? 
        `${subscriberInfo.subscriberFirstName} ${subscriberInfo.subscriberLastName}` : 
        `${patient.firstName} ${patient.lastName}`;
      
      // Add patient info in the format expected by the UI
      const enhancedSummary = {
        ...this.generateSummary(data),
        patientName: patientName,
        memberId: subscriberInfo?.alternateId || extractOptions.memberId,
        network: subscriberInfo?.claimBenefitInfo?.productName || 'Delta Dental PPO'
      };
      
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
        summary: enhancedSummary,
        // Add formatted data for UI compatibility
        claims: this.formatClaimsForUI(data)
      };
      
      logWrapper(`✅ DOT extraction complete - ${result.summary.totalClaims} claims found`);
      
      return result;
      
    } catch (error) {
      logWrapper(`❌ DOT extraction error: ${error.message}`);
      
      // Check if it's a session error
      if (error.message.includes('401') || error.message.includes('session') || error.message.includes('Bearer')) {
        logWrapper('💡 Session may have expired. Auto-login will be attempted on next run.');
        logWrapper('   If auto-login fails, please run one of:');
        logWrapper('   cd dot-extractor && npm run login:assist  (recommended)');
        logWrapper('   cd dot-extractor && npm run login:auto    (automated)');
        logWrapper('   cd dot-extractor && npm run login         (manual)');
      }
      
      throw error;
    } finally {
      // Always restore console.log
      if (!options.monitorMode) {
        console.log = originalConsoleLog;
      }
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

  // Helper pour convertir les montants
  toMoney(value) {
    // Si la valeur est masquée (XX.XX), retourner 0
    if (String(value).includes('XX')) {
      return 0;
    }
    // Robuste aux "$", ",", espaces et valeurs vides
    const v = Number(String(value ?? '').replace(/[^\d.-]/g, ''));
    return Number.isFinite(v) ? v : 0;
  }

  // Helper pour calculer les totaux depuis les line items
  totalsFromLineItems(items = []) {
    return items.reduce((acc, item) => {
      acc.billed += this.toMoney(item.billedAmount);
      acc.paid += this.toMoney(item.paidAmount || item.allowedAmount);
      acc.patient += this.toMoney(item.patientPayment || item.patientAmount);
      return acc;
    }, { billed: 0, paid: 0, patient: 0 });
  }

  generateSummary(data) {
    const summary = {
      totalClaims: 0,
      totalProcedures: 0,
      cdtCodes: new Set(),
      benefitsAvailable: false,
      familyMembers: 0,
      totalBilled: 0,
      totalPaid: 0,
      patientBalance: 0,
      planMaximum: 'N/A',
      maximumUsed: 'N/A', 
      maximumRemaining: 'N/A',
      deductible: 'N/A',
      deductibleMet: 'N/A'
    };
    
    // Count subscriber claims and calculate financials
    if (data.subscriber) {
      summary.totalClaims += data.subscriber.claims?.length || 0;
      summary.benefitsAvailable = !!data.subscriber.benefitsParsed;
      
      // Extract benefits information if available
      if (data.subscriber.benefitsParsed) {
        const benefits = data.subscriber.benefitsParsed;
        
        // Find maximum and deductible info
        const maxInfo = benefits.maximumsAndDeductibles?.find(m => 
          m.type === 'Maximum' && m.category === 'General'
        );
        const deductInfo = benefits.maximumsAndDeductibles?.find(m => 
          m.type === 'Deductible' && m.category === 'General'
        );
        
        if (maxInfo) {
          summary.planMaximum = `$${maxInfo.individualAmount || 0}`;
          summary.maximumUsed = `$${maxInfo.individualUsed || 0}`;
          summary.maximumRemaining = `$${maxInfo.individualRemaining || 0}`;
        }
        
        if (deductInfo) {
          summary.deductible = `$${deductInfo.individualAmount || 0}`;
          summary.deductibleMet = `$${deductInfo.individualUsed || 0}`;
        }
      }
      
      // Count CDT codes and calculate amounts from claims
      data.subscriber.claims?.forEach(claim => {
        if (claim.detail) {
          // Use detail-level totals if available (not masked)
          summary.totalPaid += this.toMoney(claim.detail.totalPlanPay);
          summary.patientBalance += this.toMoney(claim.detail.totalPatientPay);
          
          // Calculate billed from line items
          if (claim.detail.lineItems?.length) {
            claim.detail.lineItems.forEach(item => {
              summary.totalBilled += this.toMoney(item.submittedAmount);
              
              // Count CDT codes
              if (item.procedureCode) {
                summary.cdtCodes.add(item.procedureCode);
                summary.totalProcedures++;
              }
            });
          }
        }
      });
    }
    
    // Count dependent claims
    if (data.dependents) {
      summary.familyMembers = data.dependents.length;
      data.dependents.forEach(dep => {
        summary.totalClaims += dep.claims?.length || 0;
        
        dep.claims?.forEach(claim => {
          if (claim.detail) {
            // Use detail-level totals if available (not masked)
            summary.totalPaid += this.toMoney(claim.detail.totalPlanPay);
            summary.patientBalance += this.toMoney(claim.detail.totalPatientPay);
            
            // Calculate billed from line items
            if (claim.detail.lineItems?.length) {
              claim.detail.lineItems.forEach(item => {
                summary.totalBilled += this.toMoney(item.submittedAmount);
                
                // Count CDT codes
                if (item.procedureCode) {
                  summary.cdtCodes.add(item.procedureCode);
                  summary.totalProcedures++;
                }
              });
            }
          }
        });
      });
    }
    
    summary.uniqueCDTCodes = Array.from(summary.cdtCodes).sort();
    summary.cdtCodesCount = summary.cdtCodes.size;
    delete summary.cdtCodes; // Remove the Set object
    
    return summary;
  }

  formatClaimsForUI(data) {
    const claims = [];
    
    // Helper to format money or show masked
    const formatMoney = (value) => {
      if (String(value).includes('XX')) {
        return 'Masqué';
      }
      const num = this.toMoney(value);
      return num === 0 ? 0 : num;
    };
    
    // Process subscriber claims
    if (data.subscriber?.claims) {
      data.subscriber.claims.forEach(claim => {
        // Calculate totals from detail if available
        let totalBilled = 0;
        let totalPaid = formatMoney(claim.detail?.totalPlanPay);
        let patientAmount = formatMoney(claim.detail?.totalPatientPay);
        
        if (claim.detail) {
          // Calculate billed from line items
          if (claim.detail.lineItems) {
            let allMasked = true;
            claim.detail.lineItems.forEach(item => {
              if (!String(item.submittedAmount).includes('XX')) {
                totalBilled += this.toMoney(item.submittedAmount);
                allMasked = false;
              }
            });
            if (allMasked && claim.detail.lineItems.length > 0) {
              totalBilled = 'Masqué';
            }
          }
        }
        
        claims.push({
          claimNumber: claim.claimNumber || claim.id || 'N/A',
          patientName: `${data.subscriber.info?.subscriberFirstName || ''} ${data.subscriber.info?.subscriberLastName || ''}`.trim(),
          serviceDate: claim.serviceDate || claim.dateOfService || 'N/A',
          status: claim.claimStatus || claim.status || 'Processed',
          totalBilled: totalBilled,
          totalPaid: totalPaid,
          patientAmount: patientAmount
        });
      });
    }
    
    // Process dependent claims
    if (data.dependents) {
      data.dependents.forEach(dep => {
        if (dep.claims) {
          dep.claims.forEach(claim => {
            // Calculate totals from detail if available
            let totalBilled = 0;
            let totalPaid = formatMoney(claim.detail?.totalPlanPay);
            let patientAmount = formatMoney(claim.detail?.totalPatientPay);
            
            if (claim.detail) {
              // Calculate billed from line items
              if (claim.detail.lineItems) {
                let allMasked = true;
                claim.detail.lineItems.forEach(item => {
                  if (!String(item.submittedAmount).includes('XX')) {
                    totalBilled += this.toMoney(item.submittedAmount);
                    allMasked = false;
                  }
                });
                if (allMasked && claim.detail.lineItems.length > 0) {
                  totalBilled = 'Masqué';
                }
              }
            }
            
            claims.push({
              claimNumber: claim.claimNumber || claim.id || 'N/A',
              patientName: `${dep.info?.dependentFirstName || dep.info?.firstName || ''} ${dep.info?.dependentLastName || dep.info?.lastName || ''}`.trim(),
              serviceDate: claim.serviceDate || claim.dateOfService || 'N/A',
              status: claim.claimStatus || claim.status || 'Processed',
              totalBilled: totalBilled,
              totalPaid: totalPaid,
              patientAmount: patientAmount
            });
          });
        }
      });
    }
    
    return claims;
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
