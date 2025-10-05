const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const SESSION_DIR = path.join(__dirname, '.dnoa-session');
const STORAGE_STATE_FILE = path.join(SESSION_DIR, 'storageState.json');

class DNOAService {
  constructor(credentials = {}) {
    this.browser = null;
    this.context = null;
    this.page = null;
    this.isFirstRun = !fs.existsSync(SESSION_DIR);
    this.authToken = null; // Store token for bulk operations

    // Accept credentials from constructor (for multi-clinic support) or fallback to env vars
    this.credentials = {
      username: credentials.username || process.env.DNOA_USERNAME,
      password: credentials.password || process.env.DNOA_PASSWORD
    };
  }

  async initialize(headless = true, onLog = console.log) {
    onLog('🚀 Initializing DNOA service...');
    
    if (this.isFirstRun) {
      onLog('🆕 First run - Creating session directory');
      fs.mkdirSync(SESSION_DIR, { recursive: true });
    } else {
      onLog('✅ Using existing session');
    }

    // EXACT MetLife architecture: browser + newContext
    this.browser = await chromium.launch({
      headless,
      args: ['--disable-blink-features=AutomationControlled']
    });

    const contextOptions = {
      viewport: { width: 1280, height: 720 },
      locale: 'en-US',
      timezoneId: 'America/New_York'
    };

    // Load saved storage state if it exists (cookies, localStorage, etc.)
    if (fs.existsSync(STORAGE_STATE_FILE)) {
      contextOptions.storageState = STORAGE_STATE_FILE;
      onLog('🍪 Loaded saved cookies and storage');
    }

    // Create context from browser (MetLife style)
    this.context = await this.browser.newContext(contextOptions);

    this.page = await this.context.newPage();
    onLog('✅ Browser context created');
  }

  async saveSession(onLog = console.log) {
    // Save the complete storage state (cookies, localStorage, sessionStorage)
    await this.context.storageState({ path: STORAGE_STATE_FILE });
    onLog('💾 Session saved (cookies + storage)');
  }

  async ensureLoggedIn(onLog = console.log) {
    onLog('🔐 Checking login status...');
    
    await this.page.goto('https://www.dnoaconnect.com/#!/', { 
      waitUntil: 'networkidle',
      timeout: 300000 
    });
    
    await this.page.waitForTimeout(3000);
    
    // Better login detection - check multiple indicators
    let needsLogin = false;
    try {
      // First check URL - if it contains /member or /search, we're logged in
      const currentUrl = this.page.url();
      if (currentUrl.includes('/member') || currentUrl.includes('/search')) {
        onLog('✅ Already on member/search page - logged in!');
        needsLogin = false;
      } else {
        // Check for member search elements (positive indicator of being logged in)
        const hasSearchElements = await this.page.locator('[placeholder*="Member"], [placeholder*="Subscriber"], [placeholder*="Date of Birth"]').count() > 0;
        
        if (hasSearchElements) {
          onLog('✅ Member search elements found - already logged in!');
          needsLogin = false;
        } else {
          // Only check for login form if we don't see search elements
          const loginForm = await this.page.locator('input[placeholder*="User ID"], input[name="username"]').first();
          needsLogin = await loginForm.isVisible({ timeout: 2000 });
          
          if (needsLogin) {
            onLog('📝 Login form visible - need to login');
          } else {
            onLog('✅ No login form visible - assuming logged in');
          }
        }
      }
    } catch (e) {
      onLog('⚠️ Could not detect login status, assuming logged in');
      needsLogin = false;
    }
    
    if (needsLogin) {
      onLog('📝 Entering credentials...');

      const { username, password } = this.credentials;

      if (!username || !password) {
        throw new Error('DNOA credentials missing');
      }

      try {
        await this.page.getByRole('textbox', { name: 'User ID' }).fill(username);
        await this.page.getByRole('textbox', { name: 'Password' }).fill(password);
        
        const rememberCheckbox = this.page.getByRole('checkbox', { name: 'Remember my User ID' });
        if (await rememberCheckbox.isVisible()) {
          await rememberCheckbox.check();
        }
        
        await this.page.getByRole('button', { name: 'Login' }).click();
        await this.page.waitForTimeout(5000);
        onLog('✅ Logged in successfully');
        
        // Save the session after successful login
        await this.saveSession(onLog);
      } catch (e) {
        onLog('⚠️ Login form not found, may already be logged in');
      }
    } else {
      onLog('✅ Already logged in - session valid');
    }
    
    // Wait a bit more to ensure page is fully loaded
    await this.page.waitForTimeout(2000);
    
    // Get auth token - try multiple methods
    const authData = await this.page.evaluate(() => {
      // Try localStorage first
      const localToken = localStorage.getItem('x-auth-token');
      if (localToken) {
        return { token: localToken, source: 'localStorage' };
      }
      
      // Try cookies
      const cookieMatch = document.cookie.match(/x-auth-token=([^;]+)/);
      if (cookieMatch) {
        return { token: cookieMatch[1], source: 'cookie' };
      }
      
      // Try sessionStorage
      const sessionToken = sessionStorage.getItem('x-auth-token');
      if (sessionToken) {
        return { token: sessionToken, source: 'sessionStorage' };
      }
      
      // Check all localStorage keys
      const allKeys = Object.keys(localStorage);
      const tokenKey = allKeys.find(key => key.includes('token') || key.includes('auth'));
      if (tokenKey) {
        return { token: localStorage.getItem(tokenKey), source: `localStorage[${tokenKey}]` };
      }
      
      return { token: null, allKeys, cookies: document.cookie };
    });
    
    if (!authData.token) {
      onLog(`⚠️ No token found. Debug info: ${JSON.stringify(authData)}`);
      // Continue anyway - maybe the API doesn't need token for this session
      onLog('⚠️ Continuing without token (session might be valid)');
      return 'session-valid-no-token';
    }
    
    onLog(`🔑 Auth token retrieved from ${authData.source}`);
    this.authToken = authData.token; // Store for bulk operations
    return authData.token;
  }

  async extractPatientData(patient, onLog = console.log, skipLoginCheck = false) {
    // In bulk mode, skip redundant login checks after the first patient
    const token = skipLoginCheck && this.authToken
      ? this.authToken
      : await this.ensureLoggedIn(onLog);
    
    const patientName = patient.firstName && patient.lastName
      ? `${patient.firstName} ${patient.lastName}`
      : `Member ID: ${patient.subscriberId}`;
    onLog(`🔍 Searching for patient: ${patientName}`);
    
    const allData = {
      patient,
      extractionDate: new Date().toISOString(),
      portal: 'DNOA'
    };
    
    try {
      // 1. Get member hash
      onLog('📥 Fetching member data...');
      const membersUrl = `https://www.dnoaconnect.com/members?dateOfBirth=${patient.dateOfBirth}&subscriberId=${patient.subscriberId}`;
      
      // Prepare headers - only add token if we have one
      const headers = {};
      if (token && token !== 'session-valid-no-token') {
        headers['x-auth-token'] = token;
      }
      
      const membersResp = await this.page.request.get(membersUrl, { headers });
      
      if (!membersResp.ok()) {
        throw new Error(`API error: ${membersResp.status()}`);
      }
      
      const membersText = await membersResp.text();
      if (!membersText.trim()) {
        throw new Error('Patient not found');
      }
      
      const members = JSON.parse(membersText);
      if (!members || members.length === 0) {
        throw new Error('No members found for this patient');
      }
      
      allData.members = members;
      const memberHash = members[0]?.policies?.[0]?.referenceId;
      
      if (!memberHash) {
        throw new Error('Patient has no active policy');
      }
      
      onLog(`✅ Found patient - Policy: ${members[0]?.policies?.[0]?.groupName || 'Unknown'}`);

      // TURBO MODE: Parallel API calls for 3-5x speed boost!
      onLog('⚡ Fetching all data in parallel for maximum speed...');

      const parallelRequests = await Promise.allSettled([
        // 2. Associated members
        this.page.request.get(
          `https://www.dnoaconnect.com/members/${memberHash}/associatedMembers?dateOfBirth=${patient.dateOfBirth}&subscriberId=${patient.subscriberId}`,
          { headers }
        ).then(r => r.json()),

        // 3. Plan accumulators
        this.page.request.get(
          `https://www.dnoaconnect.com/members/${memberHash}/planAccumulators?dateOfBirth=${patient.dateOfBirth}&subscriberId=${patient.subscriberId}`,
          { headers }
        ).then(r => r.json()),

        // 4. Benefits
        this.page.request.get(
          `https://www.dnoaconnect.com/members/${memberHash}/benefits?dateOfBirth=${patient.dateOfBirth}&subscriberId=${patient.subscriberId}`,
          { headers }
        ).then(r => r.json()),

        // 5. Procedure history
        this.page.request.get(
          `https://www.dnoaconnect.com/members/${memberHash}/procedureHistory`,
          { headers }
        ).then(r => r.json()),

        // 6. Plan summary
        this.page.request.get(
          `https://www.dnoaconnect.com/members/${memberHash}/planSummary?dateOfBirth=${patient.dateOfBirth}&subscriberId=${patient.subscriberId}`,
          { headers }
        ).then(r => r.json()),

        // 7. Claims history
        this.page.request.post(
          `https://www.dnoaconnect.com/claims`,
          {
            headers: { ...headers, 'content-type': 'application/json;charset=UTF-8' },
            data: {
              searchCriteria: {
                member: { referenceId: memberHash },
                type: "claim",
                subscriberId: patient.subscriberId
              },
              member: members[0]
            }
          }
        ).then(r => r.json())
      ]);

      // Process results
      const [assocResult, accumResult, benefitsResult, historyResult, summaryResult, claimsResult] = parallelRequests;

      // Declare deduct and max outside the if block so they're available for summary
      let deduct = null;
      let max = null;

      // Extract successful results
      if (assocResult.status === 'fulfilled') {
        allData.associatedMembers = assocResult.value;
        onLog(`✅ Found ${allData.associatedMembers.length} family members`);
      }

      if (accumResult.status === 'fulfilled') {
        allData.planAccumulators = accumResult.value;
        deduct = allData.planAccumulators?.deductible?.benefitPeriod?.individual;
        if (deduct) {
          onLog(`✅ Deductible: $${deduct.amountInNetwork} (Remaining: $${deduct.remainingInNetwork})`);
        }
        max = allData.planAccumulators?.maximum?.benefitPeriod?.individual;
        if (max) {
          onLog(`✅ Annual Maximum: $${max.amountInNetwork} (Remaining: $${max.remainingInNetwork})`);
        }
      }

      if (benefitsResult.status === 'fulfilled') {
        allData.benefits = benefitsResult.value;
        onLog(`✅ Found ${allData.benefits?.categories?.length || 0} benefit categories`);
      }

      if (historyResult.status === 'fulfilled') {
        allData.procedureHistory = historyResult.value;
        onLog(`✅ Found ${allData.procedureHistory?.data?.length || allData.procedureHistory?.length || 0} procedures in history`);
      }

      if (summaryResult.status === 'fulfilled') {
        allData.planSummary = summaryResult.value;
      }

      if (claimsResult.status === 'fulfilled') {
        allData.claims = claimsResult.value;
        onLog(`✅ Found ${allData.claims?.claims?.length || 0} claims with financial details`);
      }

      // 8. Get detailed line items for each claim
      if (allData.claims?.claims && allData.claims.claims.length > 0) {
        onLog(`📥 Fetching detailed line items for ${allData.claims.claims.length} claims...`);
        for (let i = 0; i < allData.claims.claims.length; i++) {
          const claim = allData.claims.claims[i];
          try {
            const claimLinesUrl = `https://www.dnoaconnect.com/claims/${claim.claimId}/claimLines`;
            const claimLinesResp = await this.page.request.get(claimLinesUrl, { headers });
            const claimLinesData = await claimLinesResp.json();

            // Add line details to the claim
            claim.lineDetails = claimLinesData.lineDetail || [];
            onLog(`  ✓ Claim ${i + 1}/${allData.claims.claims.length}: ${claim.lineDetails.length} line items`);
          } catch (err) {
            onLog(`  ⚠️ Failed to get line details for claim ${i + 1}: ${err.message}`);
            claim.lineDetails = [];
          }
        }
      }

      onLog('✅ API data collection complete!');
      
      // Extract CDT codes from procedure history
      const cdtCodes = [];
      if (allData.procedureHistory?.data || allData.procedureHistory) {
        const procedures = allData.procedureHistory?.data || allData.procedureHistory;
        if (Array.isArray(procedures)) {
          procedures.forEach(proc => {
            if (proc.code) {  // Changed from proc.procedureCode to proc.code
              cdtCodes.push({
                code: proc.code,
                description: proc.description || 'N/A',
                date: proc.serviceDate || 'N/A',
                toothNumber: proc.toothNumber || '',
                surfaces: proc.surfaces || ''
              });
            }
          });
        }
      }
      
      // Extract CDT codes from benefits if available
      if (allData.benefits?.categories) {
        allData.benefits.categories.forEach(cat => {
          if (cat.procedureCode && !cdtCodes.find(c => c.code === cat.procedureCode)) {
            cdtCodes.push({
              code: cat.procedureCode,
              description: cat.name || cat.description || 'Coverage',
              coverage: cat.coinsuranceInNetwork + '%',
              type: 'Benefit'
            });
          }
        });
      }
      
      onLog(`✅ Found ${cdtCodes.length} CDT procedure codes`);

      // Create summary for display
      allData.summary = {
        patientName: patient.firstName && patient.lastName
          ? `${patient.firstName} ${patient.lastName}`
          : `Member ID: ${patient.subscriberId}`,
        memberId: patient.subscriberId,
        planName: members[0]?.policies?.[0]?.groupName || 'Unknown',
        status: members[0]?.policies?.[0]?.status || 'Unknown',
        deductible: deduct ? {
          amount: deduct.amountInNetwork,
          met: deduct.amountInNetwork - deduct.remainingInNetwork,
          remaining: deduct.remainingInNetwork
        } : null,
        annualMaximum: max ? {
          amount: max.amountInNetwork,
          used: max.amountInNetwork - max.remainingInNetwork,
          remaining: max.remainingInNetwork
        } : null,
        benefitCategories: allData.benefits?.categories?.length || 0,
        procedureHistory: allData.procedureHistory?.data?.length || allData.procedureHistory?.length || 0,
        claimsCount: allData.claims?.claims?.length || 0,
        totalBilled: allData.claims?.claims?.reduce((sum, claim) => sum + (claim.billedAmount || 0), 0) || 0,
        totalPaid: allData.claims?.claims?.reduce((sum, claim) => sum + (claim.paidAmount || 0), 0) || 0,
        cdtCodes: cdtCodes,
        totalCDTCodes: cdtCodes.length
      };
      
      return allData;
      
    } catch (error) {
      onLog(`❌ Error: ${error.message}`);
      throw error;
    }
  }

  async close() {
    if (this.context) {
      await this.context.close();
    }
    if (this.browser) {
      await this.browser.close();
    }
  }
}

module.exports = DNOAService;
