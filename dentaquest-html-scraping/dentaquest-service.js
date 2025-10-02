const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { enrichDentaQuestData } = require('./enrichment');

const SESSION_DIR = path.join(__dirname, '.dentaquest-session');
const STORAGE_STATE_FILE = path.join(SESSION_DIR, 'storageState.json');
const HTML_SAMPLES_DIR = path.join(__dirname, 'samples');

class DentaQuestService {
  constructor(credentials = {}) {
    this.browser = null;
    this.context = null;
    this.page = null;
    this.isFirstRun = !fs.existsSync(SESSION_DIR);

    // Accept credentials from constructor (for multi-clinic support) or fallback to env vars
    this.credentials = {
      username: credentials.username || process.env.DENTAQUEST_USERNAME,
      password: credentials.password || process.env.DENTAQUEST_PASSWORD
    };

    // Location and provider IDs
    this.locationId = credentials.locationId || process.env.DENTAQUEST_LOCATION_ID || '0013o00002Yco80AAB';
    this.providerId = credentials.providerId || process.env.DENTAQUEST_PROVIDER_ID || '001f400000CNoznAAD';

    // Initialize HTML mappings for intelligent extraction
    this.initializeHTMLMappings();

    // Ensure HTML samples directory exists
    if (!fs.existsSync(HTML_SAMPLES_DIR)) {
      fs.mkdirSync(HTML_SAMPLES_DIR, { recursive: true });
    }
  }

  initializeHTMLMappings() {
    // HTML structure mappings for intelligent extraction
    this.elementMappings = {
      patientInfo: {
        selectors: [
          '[data-patient-name]',
          '.patient-name',
          '#patientName',
          'div[class*="patient"] span[class*="name"]',
          'lightning-formatted-text[data-output-element-id*="name"]'
        ],
        attributes: ['data-patient-name', 'data-member-id', 'data-dob']
      },
      eligibility: {
        selectors: [
          '[data-eligibility]',
          '.eligibility-section',
          'div[class*="eligibility"]',
          'lightning-accordion-section[data-label*="Eligibility"]'
        ],
        patterns: {
          deductible: /deductible|ded/i,
          maximum: /maximum|max|annual/i,
          coverage: /coverage|benefit|percent/i,
          waiting: /waiting|wait/i
        }
      },
      serviceHistory: {
        selectors: [
          'table[data-service-history]',
          '.service-history-table',
          'table[class*="history"]',
          'lightning-datatable',
          'table tbody tr[data-row-key-value]'
        ],
        columns: {
          date: ['Date', 'Service Date', 'DOS', 'Date of Service'],
          code: ['Code', 'Procedure', 'CDT', 'Proc Code'],
          description: ['Description', 'Procedure Name', 'Service'],
          provider: ['Provider', 'Dentist', 'Office']
        }
      },
      coverage: {
        selectors: [
          '.coverage-details',
          'div[data-coverage]',
          'table[class*="coverage"]',
          'lightning-accordion-section[data-label*="Coverage"]'
        ],
        categories: {
          preventive: ['Preventive', 'Diagnostic', 'Cleanings'],
          basic: ['Basic', 'Fillings', 'Extractions'],
          major: ['Major', 'Crowns', 'Bridges', 'Dentures'],
          orthodontics: ['Orthodontics', 'Ortho', 'Braces']
        }
      }
    };
  }

  async initialize(headless = true, onLog = console.log) {
    onLog('🚀 Initializing DentaQuest service...');
    
    if (this.isFirstRun) {
      onLog('🆕 First run - Creating session directory');
      fs.mkdirSync(SESSION_DIR, { recursive: true });
    } else {
      onLog('✅ Using existing session');
    }

    // EXACT MetLife architecture: browser + newContext
    this.browser = await chromium.launch({
      headless,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',  // Critical for Docker
        '--disable-gpu',
        '--disable-blink-features=AutomationControlled'
      ]
    });

    const contextOptions = {
      viewport: { width: 1920, height: 1080 },
      locale: 'en-US',
      timezoneId: 'America/New_York'
      // Removed incomplete userAgent - let Playwright use its default
    };

    // Load saved storage state if it exists
    if (fs.existsSync(STORAGE_STATE_FILE)) {
      contextOptions.storageState = STORAGE_STATE_FILE;
      onLog('🍪 Loaded saved cookies and storage');
    }

    // Create context from browser (MetLife style)
    this.context = await this.browser.newContext(contextOptions);

    this.page = await this.context.newPage();
    onLog('✅ Browser context created');
  }

  async safeGoto(url, onLog = console.log) {
    for (let i = 0; i < 3; i++) {
      try {
        await this.page.goto(url, { waitUntil: 'commit', timeout: 300000 });
        await this.page.waitForLoadState('domcontentloaded', { timeout: 300000 });
        return;
      } catch (e) {
        if (e.message.includes('ERR_ABORTED') || e.message.includes('ERR_NETWORK')) {
          onLog(`⚠️ Navigation aborted (${i+1}/3) → retry in 1.5s`);
          await this.page.waitForTimeout(1500);
          continue;
        }
        throw e;
      }
    }
    throw new Error('Navigation kept aborting after 3 attempts');
  }

  async ensureLoggedIn(onLog = console.log) {
    onLog('🔐 Checking login status...');
    
    // Check if we're already logged in by going to the main page
    await this.safeGoto('https://provideraccess.dentaquest.com/s/', onLog);
    
    // Check if we're on the login page or already in the app
    const currentUrl = this.page.url();
    const isLoggedIn = currentUrl.includes('provideraccess.dentaquest.com/s/');
    
    if (!isLoggedIn || currentUrl.includes('SSOProviderLogin')) {
      onLog('📝 Logging in...');

      const username = this.credentials.username;
      const password = this.credentials.password;
      
      // Navigate to SSO login if not already there
      if (!currentUrl.includes('SSOProviderLogin')) {
        const ssoUrl = 'https://connectsso.dentaquest.com/authsso/providersso/SSOProviderLogin.aspx?TYPE=33554433&REALMOID=06-6a4c193d-7520-4f3d-b194-83367a3ef454&GUID=&SMAUTHREASON=0&METHOD=GET&SMAGENTNAME=-SM-kSqO3O4jRCSk9qqzbPcoTSjt1%2fdC6MLuwWf19frmMVfjO3ky%2bv6P02wHtOYGhNQ3Uqgm662bIsg0jgE%2bG59NfYnZup3NqXTz&TARGET=-SM-https%3a%2f%2fconnectsso%2edentaquest%2ecom%2fprovideraccessv2%2findex%2ehtml';
        await this.page.goto(ssoUrl, { waitUntil: 'domcontentloaded', timeout: 120000 });
        await this.page.waitForLoadState('networkidle', { timeout: 120000 }).catch(() => {});
      }
      
      try {
        await this.page.getByRole('textbox', { name: 'Username' }).fill(username);
        await this.page.getByRole('textbox', { name: 'Password' }).fill(password);
        await this.page.getByRole('button', { name: 'Sign in' }).click();
        
        await this.page.waitForURL('**/provideraccess.dentaquest.com/**', { timeout: 30000 });
        onLog('✅ Logged in successfully');
        
        // Save the session after successful login
        await this.saveSession(onLog);
      } catch (e) {
        onLog('⚠️ Login may have failed or already logged in');
      }
    } else {
      onLog('✅ Already logged in - session valid');
    }
  }

  async saveSession(onLog = console.log) {
    // Save the complete storage state (cookies, localStorage, sessionStorage)
    await this.context.storageState({ path: STORAGE_STATE_FILE });
    onLog('💾 Session saved (cookies + storage)');
  }

  async extractPatientData(patient, onLog = console.log, options = {}) {
    await this.ensureLoggedIn(onLog);

    onLog(`🔍 Searching for patient: ${patient.firstName} ${patient.lastName}`);

    // Options for HTML capture and intelligent extraction
    const captureHTML = options.captureHTML || process.env.CAPTURE_HTML === 'true';
    const captureStructure = options.captureStructure || process.env.CAPTURE_STRUCTURE === 'true';
    const useIntelligentExtraction = options.intelligentExtraction || process.env.INTELLIGENT_EXTRACTION === 'true';
    const htmlSamples = {};
    const pageStructures = {};

    const allData = {
      patient,
      extractionDate: new Date().toISOString(),
      portal: 'DentaQuest',
      serviceHistory: [],
      eligibilityHistory: [],
      claims: [],
      claimsDetails: [],
      overview: null,
      summary: {},
      htmlSamples: captureHTML ? htmlSamples : undefined,
      pageStructures: captureStructure ? pageStructures : undefined,
      extractionMethods: {}
    };
    
    try {
      // Navigate to search page only if not already there
      const currentUrl = this.page.url();
      // Skip navigation if we're already on the exact page
      if (currentUrl !== 'https://provideraccess.dentaquest.com/s/' && 
          !currentUrl.startsWith('https://provideraccess.dentaquest.com/s/?')) {
        await this.safeGoto('https://provideraccess.dentaquest.com/s/', onLog);
      }
      
      // Select location and provider
      onLog('📍 Setting location and provider...');
      
      // Debug: Log current URL and page content
      const debugUrl = this.page.url();
      onLog(`   Current URL: ${debugUrl}`);
      
      try {
        // Check if we're on the right page
        const pageTitle = await this.page.title();
        onLog(`   Page title: ${pageTitle}`);
        
        // Try to find the selector
        const locationSelect = this.page.getByLabel('Service Location*').first();
        await locationSelect.waitFor({ state: 'visible', timeout: 15000 });
        const locationSelector = await locationSelect.count();
        onLog(`   Location selector found: ${locationSelector > 0 ? 'YES' : 'NO'}`);
        
        if (locationSelector === 0) {
          // Take screenshot for debugging
          if (process.env.NODE_ENV === 'production' || process.env.RENDER) {
            const screenshotPath = `/tmp/dentaquest-error-${Date.now()}.png`;
            await this.page.screenshot({ path: screenshotPath, fullPage: true });
            onLog(`   📸 Screenshot saved: ${screenshotPath}`);
          }
          
          // Check if we're on login page
          const loginForm = await this.page.locator('#loginForm, .login-form, [name="login"]').count();
          if (loginForm > 0) {
            throw new Error('Session expired - login page detected');
          }
        }
        
        await this.page.getByLabel('Service Location*').selectOption(this.locationId, { timeout: 60000 });
        await this.page.getByLabel('Provider*').selectOption(this.providerId, { timeout: 60000 });
      } catch (error) {
        onLog(`   ❌ Location selector error: ${error.message}`);
        throw error;
      }
      
      await this.page.waitForTimeout(2000);
      
      // Fill search form
      onLog('📝 Filling search form...');
      const firstRow = await this.page.locator('tr').filter({ hasText: '$Label.' }).first();
      
      // Date of Birth
      const dobField = await firstRow.getByRole('textbox').nth(1);
      await dobField.click();
      await dobField.fill(patient.dateOfBirth);
      
      // Member ID
      await firstRow.getByPlaceholder('Member Number').fill(patient.subscriberId);
      
      // Name
      await firstRow.getByPlaceholder('First Name').fill(patient.firstName);
      await firstRow.getByPlaceholder('Last Name').fill(patient.lastName);
      
      // Search
      await this.page.getByRole('link', { name: 'Search', exact: true }).click();

      // Wait for results - try multiple strategies
      try {
        // First wait for any loading indicator to disappear
        await this.page.waitForTimeout(2000);

        // Then wait for results table or patient link with very long timeout
        await this.page.waitForSelector(
          `text="${patient.firstName.toUpperCase()} ${patient.lastName.toUpperCase()}"`,
          { timeout: 60000 } // 60 seconds for slow searches
        );
        onLog('✅ Patient found');
      } catch (e) {
        onLog('⚠️ Timeout waiting for patient name, checking for any results...');
        // Alternative: wait for any table with results
        const hasResults = await this.page.locator('table').first().isVisible();
        if (hasResults) {
          onLog('✅ Results table found, continuing...');
        } else {
          throw new Error('No search results found after 60 seconds');
        }
      }
      
      // Open patient details in new window
      const patientLinkPromise = this.page.waitForEvent('popup');
      await this.page.getByRole('link', { 
        name: `${patient.firstName.toUpperCase()} ${patient.lastName.toUpperCase()}` 
      }).click();
      const patientPage = await patientLinkPromise;
      
      await patientPage.waitForLoadState('networkidle', { timeout: 300000 });

      // Capture page structure if requested
      if (captureStructure) {
        onLog('🏗️ Capturing page structure...');
        this.page = patientPage; // Temporarily switch page context for capture
        const structure = await this.capturePageStructure(`patient_${patient.firstName}_${patient.lastName}`, onLog);
        pageStructures.patientPage = structure;
        this.page = await this.context.pages()[0]; // Switch back to main page
      }

      // 1. Extract COMPLETE Patient Info and Overview
      onLog('📄 Extracting complete patient info and overview...');
      try {
        // Extract ALL patient fields using evaluate
        const patientInfo = await patientPage.evaluate(() => {
          const info = {};

          // Extract from member info section
          const memberSection = document.querySelector('.memberDetailContainer');
          if (memberSection) {
            // Get all dt/dd pairs for complete extraction
            const labels = memberSection.querySelectorAll('dt');
            const values = memberSection.querySelectorAll('dd');

            labels.forEach((label, i) => {
              const key = label.textContent.trim().replace(':', '');
              const value = values[i]?.textContent.trim();
              if (key && value) {
                info[key] = value;
              }
            });
          }

          // Extract eligibility status
          const eligibleElement = document.querySelector('.eligibilityTitle');
          if (eligibleElement) {
            info.eligibilityStatus = eligibleElement.textContent.trim();
          }

          // Extract plan info
          const planElement = document.querySelector('.plan-panel');
          if (planElement) {
            const planName = planElement.querySelector('.slds-text-heading_small')?.nextElementSibling?.textContent;
            if (planName) info.plan = planName.trim();

            // Get Issued ID and Coverage End Date
            // Find Issued ID using text search
            const issuedIdHeader = Array.from(planElement.querySelectorAll('h3')).find(h =>
              h.textContent?.includes('Issued ID')
            );
            const issuedId = issuedIdHeader?.nextElementSibling?.textContent;
            if (issuedId) info.issuedId = issuedId.trim();
          }

          return info;
        });

        // Extract Primary Care Provider info
        const pcp = await patientPage.evaluate(() => {
          const pcpInfo = {};

          // Find PCP section by heading
          const pcpSection = Array.from(document.querySelectorAll('h3')).find(h =>
            h.textContent.includes('Primary Care Provider')
          )?.parentElement;

          if (pcpSection) {
            const dlElement = pcpSection.querySelector('dl');
            if (dlElement) {
              const dts = dlElement.querySelectorAll('dt');
              const dds = dlElement.querySelectorAll('dd');

              dts.forEach((dt, i) => {
                const key = dt.textContent.trim().replace(':', '');
                const value = dds[i]?.textContent.trim();
                if (key && value) {
                  pcpInfo[key] = value;
                }
              });
            }
          }

          return pcpInfo;
        });

        // Extract Other Coverage info
        const otherCoverage = await patientPage.evaluate(() => {
          const otherCovSection = Array.from(document.querySelectorAll('h3')).find(h =>
            h.textContent.includes('Other Coverage')
          );

          if (otherCovSection) {
            const nextElement = otherCovSection.nextElementSibling;
            return nextElement?.textContent.trim();
          }
          return null;
        });

        // Store complete patient data
        allData.patientComplete = {
          ...patientInfo,
          primaryCareProvider: pcp,
          otherCoverage: otherCoverage
        };

        // Map to standard fields
        allData.patient = {
          ...allData.patient,
          name: patientInfo['Name'] || `${patient.firstName} ${patient.lastName}`,
          relationship: patientInfo['Relationship'],
          dob: patientInfo['DOB'] || patient.dateOfBirth,
          gender: patientInfo['Gender'],
          primaryAddress: patientInfo['Primary Address'],
          workPhone: patientInfo['Work Phone'],
          faxNumber: patientInfo['Fax Number'],
          primaryHomePhone: patientInfo['Primary Home Phone'],
          plan: patientInfo.plan,
          issuedId: patientInfo.issuedId,
          eligibilityStatus: patientInfo.eligibilityStatus
        };

        // Also get the overview tab content
        const overviewElement = patientPage.locator('.slds-tabs__content, [role="tabpanel"]').first();
        const overviewText = await overviewElement.textContent();

        if (captureHTML) {
          const overviewHTML = await overviewElement.innerHTML();
          htmlSamples.overview = overviewHTML;
          onLog(`  📸 Overview HTML captured (${overviewHTML.length} chars)`);
        }

        allData.overview = {
          raw: overviewText,
          structured: patientInfo,
          primaryCareProvider: pcp,
          otherCoverage: otherCoverage,
          extractionMethod: 'complete'
        };

      } catch (e) {
        onLog('⚠️ Could not extract complete overview: ' + e.message);
        allData.overview = null;
      }
      
      // 2. Extract Claims (with retry logic)
      onLog('💰 Extracting claims...');
      let claimsExtracted = false;
      let retryCount = 0;
      
      while (!claimsExtracted && retryCount < 2) {
        try {
          if (retryCount > 0) {
            onLog('  🔄 Retrying claims extraction...');
            await patientPage.waitForTimeout(3000);
          }
          
          // Try multiple selectors for claims tab
          try {
            await patientPage.locator('#claims-tab__item').click();
          } catch (e) {
            try {
              await patientPage.getByRole('tab', { name: /Claim.*Authorization/i }).click();
            } catch (e2) {
              await patientPage.locator('[id*="claim" i], [aria-label*="Claim" i]').first().click();
            }
          }
          await patientPage.waitForTimeout(3000);

        // Capture Claims HTML if requested
        if (captureHTML && retryCount === 0) {
          try {
            const claimsHTML = await patientPage.locator('table').first().innerHTML();
            htmlSamples.claims = claimsHTML;
            onLog(`  📸 Claims HTML captured (${claimsHTML.length} chars)`);
          } catch (e) {}
        }

        // Extract claims table
        const claimsTable = await patientPage.locator('#claimTable, table').first();
        const claimsRows = await claimsTable.locator('tbody tr').all();
        
        for (const row of claimsRows) {
          const cells = await row.locator('td').allTextContents();
          if (cells.length >= 7) {
            const claim = {
              number: cells[0],
              serviceDate: cells[1],
              provider: cells[2],
              location: cells[3],
              status: cells[4],
              billed: this.parseAmount(cells[5]),
              paid: this.parseAmount(cells[6])
            };
            allData.claims.push(claim);
            
            // Try to get claim details
            try {
              const claimLink = row.locator('a').first();
              if (await claimLink.isVisible()) {
                onLog(`  📋 Opening claim ${claim.number}...`);
                
                const claimDetailPromise = patientPage.waitForEvent('popup');
                await claimLink.click();
                const claimDetailPage = await claimDetailPromise;
                
                await claimDetailPage.waitForLoadState('networkidle', { timeout: 300000 });
                
                const claimDetail = await this.extractClaimDetails(claimDetailPage);
                allData.claimsDetails.push({
                  claimNumber: claim.number,
                  ...claimDetail
                });
                
                await claimDetailPage.close();
              }
            } catch (e) {
              onLog(`  ⚠️ Could not open claim details for ${claim.number}`);
            }
          }
        }
        
        // Check if we found claims
        if (allData.claims.length > 0) {
          claimsExtracted = true;
          onLog(`✅ Found ${allData.claims.length} claims`);
        } else if (retryCount === 0) {
          onLog('  ⚠️ No claims found, will retry...');
        }
        
        retryCount++;
        
        } catch (e) {
          if (retryCount === 0) {
            onLog('  ⚠️ Claims extraction failed, retrying...');
            retryCount++;
          } else {
            onLog('⚠️ Could not extract claims after retry');
            break;
          }
        }
      }
      
      // 3. Extract Service History (with retry logic)
      onLog('📋 Extracting service history...');
      let historyExtracted = false;
      let historyRetryCount = 0;
      const procedures = [];

      while (!historyExtracted && historyRetryCount < 2) {
        try {
          if (historyRetryCount > 0) {
            onLog('  🔄 Retrying service history extraction...');
            procedures.length = 0; // Clear previous attempt
          }

          await patientPage.getByRole('tab', { name: 'Service History' }).click();
          await patientPage.waitForTimeout(4000); // Increased timeout

          // Capture Service History HTML if requested
          if (captureHTML && historyRetryCount === 0) {
            try {
              const serviceHTML = await patientPage.locator('table').first().innerHTML();
              htmlSamples.serviceHistory = serviceHTML;
              onLog(`  📸 Service History HTML captured (${serviceHTML.length} chars)`);
            } catch (e) {}
          }

          // Try intelligent extraction first if enabled
          if (useIntelligentExtraction && historyRetryCount === 0) {
            try {
              this.page = patientPage;
              const intelligentHistory = await this.extractServiceHistoryIntelligent(onLog);
              if (intelligentHistory && intelligentHistory.length > 0) {
                onLog(`  🤖 Intelligent extraction found ${intelligentHistory.length} records`);
                allData.extractionMethods.serviceHistory = 'intelligent mapping';

                // Convert intelligent extraction results to standard format
                intelligentHistory.forEach(item => {
                  procedures.push({
                    date: item.date || '',
                    code: item.code || '',
                    description: item.description || '',
                    provider: item.provider || ''
                  });
                });

                if (procedures.length > 0) {
                  historyExtracted = true;
                  allData.serviceHistory = procedures;
                  this.page = await this.context.pages()[0];
                  continue; // Skip standard extraction if intelligent was successful
                }
              }
              this.page = await this.context.pages()[0];
            } catch (e) {
              onLog(`  ⚠️ Intelligent extraction failed: ${e.message}`);
              this.page = await this.context.pages()[0];
            }
          }

          let pageNum = 1;
          let hasNextPage = true;
          
          while (hasNextPage) {
            onLog(`  📄 Page ${pageNum}...`);
            
            // Wait for table to load
            await patientPage.waitForSelector('table tbody tr', { timeout: 5000 });
            
            // Extract procedures with COMPLETE descriptions from current page
            const pageData = await patientPage.evaluate(() => {
              const procedures = [];
              const table = document.querySelector('#historyTable, table');

              if (table) {
                const headers = Array.from(table.querySelectorAll('thead th')).map(th => th.textContent.trim());
                const rows = table.querySelectorAll('tbody tr');

                rows.forEach(row => {
                  const cells = row.querySelectorAll('td');
                  if (cells.length >= headers.length) {
                    const procedure = {};
                    headers.forEach((header, i) => {
                      procedure[header] = cells[i]?.textContent.trim();
                    });

                    // Only include if has procedure code
                    const code = procedure['Procedure Code'];
                    if (code && code.match(/^D\d{4}/)) {
                      procedures.push({
                        date: procedure['Service Date'],
                        code: code,
                        description: procedure['Procedure Code Description'] || '',
                        toothSurface: procedure['Tooth/Quad/Arch/Surface'] || '',
                        placeOfService: procedure['Place of Service'] || ''
                      });
                    }
                  }
                });
              }

              return procedures;
            });

            // Add extracted procedures
            procedures.push(...pageData);
          
          // Check for next page
          try {
            const nextButton = patientPage.getByRole('link', { name: 'Next' });
            const isVisible = await nextButton.isVisible({ timeout: 2000 });
            
            if (isVisible) {
              const isDisabled = await nextButton.evaluate(el => 
                el.classList.contains('disabled') || 
                el.getAttribute('aria-disabled') === 'true'
              );
              
              if (!isDisabled) {
                await nextButton.click();
                await patientPage.waitForTimeout(2000); // Increased from 1000
                pageNum++;
              } else {
                hasNextPage = false;
              }
            } else {
              hasNextPage = false;
            }
          } catch (e) {
            hasNextPage = false;
          }
        }
        
        // Check if we found procedures
        if (procedures.length > 0 || pageNum > 1) {
          historyExtracted = true;
          allData.serviceHistory = procedures;
          onLog(`✅ Found ${procedures.length} procedures in ${pageNum} pages`);
        } else if (historyRetryCount === 0) {
          onLog('  ⚠️ No procedures found, will retry...');
        }
        
        historyRetryCount++;
        
        } catch (e) {
          if (historyRetryCount === 0) {
            onLog('  ⚠️ Service history extraction failed, retrying...');
            historyRetryCount++;
          } else {
            onLog('⚠️ Could not extract service history after retry');
            break;
          }
        }
      }
      
      // 4. Extract Eligibility History
      onLog('✅ Extracting eligibility...');
      try {
        await patientPage.getByRole('tab', { name: 'Eligibility History' }).click();
        await patientPage.waitForTimeout(2000);

        // Capture Eligibility HTML if requested
        if (captureHTML) {
          try {
            const eligibilityHTML = await patientPage.locator('table').first().innerHTML();
            htmlSamples.eligibility = eligibilityHTML;
            onLog(`  📸 Eligibility HTML captured (${eligibilityHTML.length} chars)`);
          } catch (e) {}
        }

        const eligibilityTable = await patientPage.locator('table').first();
        const headers = await eligibilityTable.locator('th').allTextContents();
        const rows = await eligibilityTable.locator('tbody tr').all();
        
        for (const row of rows) {
          const cells = await row.locator('td').allTextContents();
          if (cells.length > 0) {
            const record = {};
            headers.forEach((header, index) => {
              record[header] = cells[index] || '';
            });
            allData.eligibilityHistory.push(record);
            
            // Check eligibility status
            if (record['Termination Date']) {
              allData.summary.coverageEndDate = record['Termination Date'];
              allData.summary.isEligible = !record['Termination Date'] || 
                new Date(record['Termination Date']) > new Date();
            }
          }
        }
        
        onLog(`✅ Found ${allData.eligibilityHistory.length} eligibility records`);
        
      } catch (e) {
        onLog('⚠️ Could not extract eligibility');
      }
      
      await patientPage.close();
      
      // Calculate summary
      this.calculateSummary(allData);
      
      // Extract CDT codes
      const cdtCodes = [];
      
      // From service history
      if (allData.serviceHistory) {
        allData.serviceHistory.forEach(proc => {
          if (proc.code && proc.code.match(/^D\d{4}/)) {
            cdtCodes.push({
              code: proc.code,
              description: proc.description || 'N/A',
              date: proc.date || 'N/A',
              provider: proc.provider || 'N/A'
            });
          }
        });
      }
      
      // From claim details
      if (allData.claimsDetails) {
        allData.claimsDetails.forEach(claim => {
          if (claim.services) {
            claim.services.forEach(service => {
              if (service.procedureCode && service.procedureCode.match(/^D\d{4}/)) {
                if (!cdtCodes.find(c => c.code === service.procedureCode && c.date === service.date)) {
                  cdtCodes.push({
                    code: service.procedureCode,
                    description: `Tooth ${service.tooth || 'N/A'}`,
                    date: service.date || 'N/A',
                    billed: service.billed || 'N/A'
                  });
                }
              }
            });
          }
        });
      }
      
      allData.summary.cdtCodes = cdtCodes;
      allData.summary.totalCDTCodes = cdtCodes.length;

      onLog(`✅ Extraction complete! Found ${cdtCodes.length} CDT codes`);

      // Enrich data with plan coverage details
      const enrichedData = enrichDentaQuestData(allData, onLog);

      return enrichedData;
      
    } catch (error) {
      onLog(`❌ Error: ${error.message}`);
      throw error;
    }
  }

  async extractClaimDetails(claimPage) {
    const details = {};

    try {
      // Extract ALL claim fields using evaluate
      const claimInfo = await claimPage.evaluate(() => {
        const info = {};

        // Extract all dt/dd pairs from Claims Information section
        const claimsSection = Array.from(document.querySelectorAll('h4, li')).find(h =>
          h.textContent.includes('Claims Information')
        )?.closest('div');

        if (claimsSection) {
          const dlElement = claimsSection.querySelector('dl');
          if (dlElement) {
            const dts = dlElement.querySelectorAll('dt');
            const dds = dlElement.querySelectorAll('dd');

            dts.forEach((dt, i) => {
              const key = dt.textContent.trim().replace(':', '');
              const value = dds[i]?.textContent.trim();
              if (key && value) {
                info[key] = value;
              }
            });
          }
        }

        // Also get member and provider info sections
        const allSections = document.querySelectorAll('dl');
        allSections.forEach(dl => {
          const dts = dl.querySelectorAll('dt');
          const dds = dl.querySelectorAll('dd');

          dts.forEach((dt, i) => {
            const key = dt.textContent.trim().replace(':', '');
            const value = dds[i]?.textContent.trim();
            if (key && value && !info[key]) {
              info[key] = value;
            }
          });
        });

        return info;
      });

      // Store all extracted claim info
      details.memberName = claimInfo['Member Name'];
      details.memberDOB = claimInfo['D.O.B.'];
      details.memberNumber = claimInfo['Member Number'];
      details.plan = claimInfo['Plan'];
      details.provider = claimInfo['Provider'];
      details.serviceLocation = claimInfo['Service Location'];
      details.business = claimInfo['Business'];

      // Claims specific fields
      details.placeOfService = claimInfo['P.O.S'] || claimInfo['P.O.S:'];
      details.officeReferenceNumber = claimInfo['Office Reference #'] || claimInfo['Office Ref #'];
      details.referralNumber = claimInfo['Referral #'] || claimInfo['ReferralNum'];
      details.icdPrimary = claimInfo['ICD Code (primary)'] || claimInfo['ICDPrimary'];
      details.icdSecondary = claimInfo['ICD Code (secondary)'] || claimInfo['ICDSecondary'];
      details.icdThird = claimInfo['ICD Code (third)'] || claimInfo['ICDThird'];
      details.icdFourth = claimInfo['ICD Code (fourth)'] || claimInfo['ICDFourth'];

      // Financial fields
      details.totalBilled = this.parseAmount(claimInfo['Total Billed Amount']);
      details.totalPatientPay = this.parseAmount(claimInfo['Total Patient Pay']);
      details.payment = this.parseAmount(claimInfo['Payment']);
      details.paymentDate = claimInfo['Payment Date'];
      details.checkETFNumber = claimInfo['Check/ETF Number'] || claimInfo['CheckNum'];
      details.receivedDate = claimInfo['Received Date'];
      details.finalDecisionDate = claimInfo['Final Decision Date'] || claimInfo['OriginalDecisionDate'];
      details.notes = claimInfo['Notes'];

      // Extract services table with complete info
      const servicesData = await claimPage.evaluate(() => {
        const services = [];

        // Find services table by looking for Service Date header
        const allTables = Array.from(document.querySelectorAll('table'));
        const servicesTable = allTables.find(table => {
          const headers = table.querySelectorAll('th');
          return Array.from(headers).some(h => h.textContent?.includes('Service Date'));
        });

        if (servicesTable) {
          const headers = Array.from(servicesTable.querySelectorAll('thead th')).map(th => th.textContent.trim());
          const rows = servicesTable.querySelectorAll('tbody > tr');

          rows.forEach(row => {
            const cells = row.querySelectorAll('td');
            if (cells.length >= headers.length) {
              const service = {};
              headers.forEach((header, i) => {
                service[header] = cells[i]?.textContent.trim();
              });

              // Check if this is a service row (has procedure code)
              if (service['Submitted Procedure Code'] || service['Procedure Code']) {
                services.push(service);

                // Check for additional info in next row (Paid Procedure Code, ICD Codes)
                const nextRow = row.nextElementSibling;
                if (nextRow && nextRow.querySelector('td')?.textContent.includes('Paid Procedure Code')) {
                  const additionalInfo = nextRow.textContent;
                  const paidCodeMatch = additionalInfo.match(/Paid Procedure Code:\s*(D\d{4})/);
                  const icdMatch = additionalInfo.match(/ICD Codes\s*:\s*([^\n]+)/);

                  if (paidCodeMatch) service.paidProcedureCode = paidCodeMatch[1];
                  if (icdMatch) service.icdCodes = icdMatch[1].trim();
                }
              }
            }
          });
        }

        return services;
      });

      details.services = servicesData.map(service => ({
        date: service['Service Date'],
        procedureCode: service['Submitted Procedure Code'] || service['Procedure Code'],
        paidProcedureCode: service.paidProcedureCode,
        tooth: service['Tooth/Quad/Arch/Surface'],
        quantity: service['Qty'] || service['Quantity'],
        status: service['Status'],
        processingPolicies: service['Processing Policies'],
        billed: service['Billed'],
        patientPay: service['Patient Pay'] || service['PatientPaidAmount'],
        paid: service['Paid'],
        icdCodes: service.icdCodes
      }));

    } catch (e) {
      console.log('⚠️ Error extracting complete claim details:', e.message);
    }

    return details;
  }

  calculateSummary(data) {
    // Calculate totals from claims
    if (data.claims.length > 0) {
      data.summary.totalBilled = data.claims.reduce((sum, claim) => 
        sum + (claim.billed || 0), 0);
      
      data.summary.totalPaid = data.claims.reduce((sum, claim) => 
        sum + (claim.paid || 0), 0);
    }
    
    // From claim details
    if (data.claimsDetails.length > 0) {
      const detailBilled = data.claimsDetails.reduce((sum, claim) => 
        sum + (claim.totalBilled || 0), 0);
      
      const detailPaid = data.claimsDetails.reduce((sum, claim) => 
        sum + (claim.payment || 0), 0);
      
      const detailPatient = data.claimsDetails.reduce((sum, claim) => 
        sum + (claim.totalPatientPay || 0), 0);
      
      if (detailBilled > 0) data.summary.totalBilled = detailBilled;
      if (detailPaid > 0) data.summary.totalPaid = detailPaid;
      data.summary.patientResponsibility = detailPatient;
    }
    
    // Check eligibility
    if (!data.summary.isEligible && data.eligibilityHistory?.length > 0) {
      const latestEligibility = data.eligibilityHistory[0];
      data.summary.isEligible = !latestEligibility['Termination Date'] || 
        new Date(latestEligibility['Termination Date']) > new Date();
    }
    
    // Add summary fields
    data.summary.patientName = `${data.patient.firstName} ${data.patient.lastName}`;
    data.summary.memberId = data.patient.subscriberId;
    data.summary.totalClaims = data.claims.length;
    data.summary.totalServices = data.serviceHistory.length;
  }

  parseAmount(amountStr) {
    if (!amountStr) return 0;
    return parseFloat(amountStr.replace(/[$,]/g, '')) || 0;
  }

  // NEW: Capture and save HTML structure for analysis
  async capturePageStructure(pageName = 'page', onLog = console.log) {
    onLog(`📸 Capturing HTML structure for ${pageName}...`);

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `${pageName}_${timestamp}.html`;
    const filePath = path.join(HTML_SAMPLES_DIR, fileName);

    // Get full HTML
    const html = await this.page.content();

    // Save full HTML
    fs.writeFileSync(filePath, html);
    onLog(`💾 Saved HTML to ${fileName}`);

    // Analyze structure
    const structure = await this.analyzePageStructure();
    const structurePath = path.join(HTML_SAMPLES_DIR, `${pageName}_${timestamp}_structure.json`);
    fs.writeFileSync(structurePath, JSON.stringify(structure, null, 2));
    onLog(`📊 Saved structure analysis to ${pageName}_${timestamp}_structure.json`);

    return structure;
  }

  // NEW: Analyze page structure to understand element patterns
  async analyzePageStructure() {
    return await this.page.evaluate(() => {
      const structure = {
        forms: [],
        tables: [],
        dataAttributes: [],
        lightningComponents: [],
        patterns: {
          patientInfo: [],
          eligibility: [],
          coverage: [],
          history: []
        }
      };

      // Find all forms
      document.querySelectorAll('form').forEach(form => {
        structure.forms.push({
          id: form.id,
          className: form.className,
          action: form.action,
          fields: Array.from(form.querySelectorAll('input, select, textarea')).map(field => ({
            name: field.name,
            id: field.id,
            type: field.type,
            className: field.className
          }))
        });
      });

      // Find all tables
      document.querySelectorAll('table').forEach(table => {
        const headers = Array.from(table.querySelectorAll('th')).map(th => th.textContent.trim());
        structure.tables.push({
          id: table.id,
          className: table.className,
          headers,
          rowCount: table.querySelectorAll('tbody tr').length
        });
      });

      // Find all elements with data attributes
      document.querySelectorAll('[data-id], [data-key], [data-label], [data-value]').forEach(elem => {
        structure.dataAttributes.push({
          tag: elem.tagName,
          dataId: elem.getAttribute('data-id'),
          dataKey: elem.getAttribute('data-key'),
          dataLabel: elem.getAttribute('data-label'),
          dataValue: elem.getAttribute('data-value'),
          text: elem.textContent.substring(0, 100)
        });
      });

      // Find Lightning components (Salesforce)
      document.querySelectorAll('[class*="lightning"], [data-component-class]').forEach(elem => {
        structure.lightningComponents.push({
          tag: elem.tagName,
          className: elem.className,
          componentClass: elem.getAttribute('data-component-class'),
          text: elem.textContent.substring(0, 100)
        });
      });

      // Pattern detection
      const textPatterns = {
        patient: /patient|member|subscriber|enrollee/i,
        eligibility: /eligibility|benefit|coverage|maximum|deductible/i,
        history: /history|claim|service|procedure/i,
        coverage: /preventive|basic|major|ortho/i
      };

      Object.entries(textPatterns).forEach(([key, pattern]) => {
        document.querySelectorAll('*').forEach(elem => {
          if (elem.textContent && pattern.test(elem.textContent) && elem.children.length < 5) {
            structure.patterns[key === 'patient' ? 'patientInfo' : key].push({
              tag: elem.tagName,
              className: elem.className,
              id: elem.id,
              text: elem.textContent.substring(0, 200)
            });
          }
        });
      });

      return structure;
    });
  }

  // NEW: Smart element extraction using multiple strategies
  async extractWithIntelligence(extractionType, onLog = console.log) {
    onLog(`🤖 Intelligent extraction for: ${extractionType}`);

    const mapping = this.elementMappings[extractionType];
    if (!mapping) {
      onLog(`⚠️ No mapping found for ${extractionType}`);
      return null;
    }

    const results = await this.page.evaluate((mapping, type) => {
      const extracted = {
        type,
        data: {},
        elements: [],
        method: null
      };

      // Try each selector strategy
      for (const selector of mapping.selectors) {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          extracted.method = `selector: ${selector}`;
          extracted.elements = Array.from(elements).map(el => ({
            html: el.outerHTML.substring(0, 500),
            text: el.textContent.trim().substring(0, 200),
            attributes: Array.from(el.attributes).reduce((acc, attr) => {
              acc[attr.name] = attr.value;
              return acc;
            }, {})
          }));
          break;
        }
      }

      // If no direct selector match, try pattern matching
      if (extracted.elements.length === 0 && mapping.patterns) {
        Object.entries(mapping.patterns).forEach(([key, pattern]) => {
          const matches = Array.from(document.querySelectorAll('*')).filter(el =>
            pattern.test(el.textContent)
          );
          if (matches.length > 0) {
            extracted.data[key] = matches.map(el => ({
              text: el.textContent.trim(),
              tag: el.tagName,
              className: el.className
            }));
          }
        });
        if (Object.keys(extracted.data).length > 0) {
          extracted.method = 'pattern matching';
        }
      }

      return extracted;
    }, mapping, extractionType);

    onLog(`✅ Extracted via ${results.method || 'no method'}: ${results.elements.length} elements`);
    return results;
  }

  // NEW: Extract service history with intelligent column mapping
  async extractServiceHistoryIntelligent(onLog = console.log) {
    onLog('📋 Extracting service history with intelligent mapping...');

    const historyData = await this.page.evaluate((mapping) => {
      const history = [];

      // Find the service history table
      let table = null;
      for (const selector of mapping.selectors) {
        const found = document.querySelector(selector);
        if (found) {
          table = found.tagName === 'TABLE' ? found : found.querySelector('table');
          if (table) break;
        }
      }

      if (!table) return history;

      // Get headers and map to expected columns
      const headers = Array.from(table.querySelectorAll('th')).map(th => th.textContent.trim());
      const columnMap = {};

      Object.entries(mapping.columns).forEach(([key, variations]) => {
        headers.forEach((header, index) => {
          if (variations.some(v => header.toLowerCase().includes(v.toLowerCase()))) {
            columnMap[key] = index;
          }
        });
      });

      // Extract rows
      const rows = table.querySelectorAll('tbody tr');
      rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length > 0) {
          const entry = {};
          Object.entries(columnMap).forEach(([key, index]) => {
            if (cells[index]) {
              entry[key] = cells[index].textContent.trim();
            }
          });
          if (Object.keys(entry).length > 0) {
            history.push(entry);
          }
        }
      });

      return history;
    }, this.elementMappings.serviceHistory);

    onLog(`✅ Extracted ${historyData.length} history records`);
    return historyData;
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

module.exports = DentaQuestService;
