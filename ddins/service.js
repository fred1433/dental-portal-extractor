const { request } = require('playwright');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
require('dotenv').config();

class DDINSService {
    constructor() {
        this.storageStatePath = process.env.DDINS_SESSION_PATH
            || path.join(__dirname, '..', '.ddins-session', 'storageState.json');
        this.baseURL = 'https://www.deltadentalins.com';
        this.ptUserId = process.env.DDINS_PT_USERID || null;
        this.plocId = process.env.DDINS_PLOC || null;
        this.autoReloginAttempted = false;
    }

    isHtml(text) {
        return /^<!doctype html/i.test(text) || /^<html/i.test(text);
    }

    async parseJsonSafe(response) {
        const contentType = (response.headers()['content-type'] || '').toLowerCase();
        const body = await response.text();
        
        if (!body || !body.trim()) return null;
        
        if (contentType.includes('text/html') || this.isHtml(body)) {
            const code = response.status();
            throw Object.assign(new Error(`HTML response from ${response.url()} (status ${code})`), { 
                code: 'HTML_RESPONSE' 
            });
        }
        
        try {
            return JSON.parse(body);
        } catch {
            // Some endpoints return ion+json or text/plain JSON
            return JSON.parse(body);
        }
    }

    async tryAutoLogin(onLog = console.log) {
        onLog('   🔄 Session expired, attempting auto-login...');

        return new Promise((resolve) => {
            const loginScriptPath = path.join(__dirname, 'auto-login.js');
            const child = spawn('node', [loginScriptPath], {
                cwd: __dirname,
                env: { ...process.env },
                stdio: ['inherit', 'pipe', 'pipe']
            });
            
            let output = '';
            child.stdout.on('data', (data) => {
                output += data.toString();
                // Log important messages
                const lines = data.toString().split('\n');
                for (const line of lines) {
                    if (line.includes('✅') || line.includes('❌') || line.includes('⚠️')) {
                        onLog(`   ${line.trim()}`);
                    }
                }
            });
            
            child.stderr.on('data', (data) => {
                output += data.toString();
            });
            
            child.on('close', (code) => {
                if (code === 0) {
                    onLog('   ✅ Auto-login successful!');
                    // Give it a moment for the file to be written
                    setTimeout(() => resolve(true), 1000);
                } else {
                    onLog('   ❌ Auto-login failed');
                    resolve(false);
                }
            });
            
            // Timeout after 120 seconds (Okta + redirects can be slow)
            setTimeout(() => {
                child.kill();
                onLog('   ⏱️ Auto-login timeout');
                resolve(false);
            }, 120000);
        });
    }

    async initialize(onLog = console.log) {
        onLog('🚀 Initializing DDINS service...');
        // Check and refresh session if needed
        const sessionValid = await this.makeApiContext(onLog);
        if (sessionValid) {
            onLog('✅ DDINS service initialized');
        }
        return sessionValid;
    }

    async resolvePlocId(api, onLog = console.log) {
        if (this.plocId) return this.plocId;
        try {
            const res = await api.post('/provider-tools/v2/api/practice-location/locations', { data: {} });
            const json = await this.parseJsonSafe(res);
            const arr = Array.isArray(json) ? json : (json?.data || json?.locations || []);
            const first = Array.isArray(arr) && arr.length ? arr[0] : null;
            const id = first?.mtvPlocId || first?.id || first?.locationId;
            if (id) {
                this.plocId = String(id);
                onLog(`   ✓ Resolved practice location: ${this.plocId}`);
            } else {
                onLog('   ⚠️ Could not resolve practice location automatically');
            }
        } catch (e) {
            onLog(`   ⚠️ PLOC resolution failed: ${e.message}`);
        }
        return this.plocId;
    }

    async makeApiContext(onLog = console.log) {
        // Check if session file exists
        if (!fs.existsSync(this.storageStatePath)) {
            // Try auto-login
            const loginSuccess = await this.tryAutoLogin(onLog);
            if (!loginSuccess) {
                throw new Error('No DDINS session. Auto-login failed. Please run manually: node ddins/auto-login.js');
            }
        }
        
        // Extract pt-userid from storageState
        if (fs.existsSync(this.storageStatePath)) {
            const storageState = JSON.parse(fs.readFileSync(this.storageStatePath, 'utf8'));
            
            // Find pt-userid from localStorage
            const origins = storageState.origins || [];
            for (const origin of origins) {
                if (origin.origin === 'https://www.deltadentalins.com' && origin.localStorage) {
                    for (const item of origin.localStorage) {
                        if (!this.ptUserId && (item.name === 'pt-userid' || item.name === 'ptUserId')) {
                            this.ptUserId = item.value;
                        }
                        if (!this.plocId && (item.name === 'mtvPlocId' || item.name === 'practiceLocationId')) {
                            this.plocId = item.value;
                        }
                    }
                }
            }
        }

        // Fallback to environment variables
        if (!this.ptUserId && process.env.DDINS_PT_USERID) {
            this.ptUserId = process.env.DDINS_PT_USERID;
        }
        if (!this.plocId && process.env.DDINS_PLOC) {
            this.plocId = process.env.DDINS_PLOC;
        }

        if (!this.ptUserId) {
            // Session file exists but no pt-userid, try auto-login
            if (!this.autoReloginAttempted) {
                this.autoReloginAttempted = true;
                const loginSuccess = await this.tryAutoLogin(onLog);
                if (loginSuccess) {
                    // Re-read the session file
                    return this.makeApiContext(onLog);
                }
            }
            throw new Error('No valid DDINS session (missing pt-userid). Add DDINS_PT_USERID to .env or run: node ddins/auto-login.js');
        }

        return await request.newContext({
            baseURL: this.baseURL,
            storageState: this.storageStatePath,
            extraHTTPHeaders: {
                'accept': 'application/json, text/plain, */*',
                'content-type': 'application/json',
                'referer': 'https://www.deltadentalins.com/provider-tools/v2/eligibility-benefits',
                'pt-userid': this.ptUserId
            },
            timeout: 30000
        });
    }

    async checkSession(api, onLog = console.log) {
        // Quick session check - use the lightest possible endpoint
        try {
            // First try a simple GET that should be fast
            const res = await api.get('/provider-tools/v2/api/eligibility/persons', {
                timeout: 5000 // Quick timeout for session check
            });

            // If we get JSON back, session is valid
            const contentType = (res.headers()['content-type'] || '').toLowerCase();
            if (contentType.includes('application/json')) {
                return true; // Session valid
            }

            // HTML response = need to login
            throw Object.assign(new Error('Session expired'), { code: 'HTML_RESPONSE' });

        } catch (e) {
            // Fallback to original method if needed
            if (e.code === 'HTML_RESPONSE') throw e;

            // Try the original locations endpoint as fallback
            try {
                const res = await api.post('/provider-tools/v2/api/practice-location/locations', { data: {} });
                const json = await this.parseJsonSafe(res);
                if (!this.plocId) await this.resolvePlocId(api, onLog);
                return json;
            } catch (fallbackError) {
                throw fallbackError;
            }
        }
    }

    async getEligibility(api, enrolleeId) {
        const response = await api.get(`/provider-tools/v2/api/eligibility/patient/${encodeURIComponent(enrolleeId)}`, {
            headers: {
                enrolleeid: String(enrolleeId),
                referer: 'https://www.deltadentalins.com/provider-tools/v2/eligibility-benefits'
            }
        });
        return await this.parseJsonSafe(response);
    }

    // -- ADD: robust eligibility bundle (uses enrolleeid header)
    async getEligibilityBundle(api, enrolleeId) {
        const headers = {
            enrolleeid: String(enrolleeId),
            referer: 'https://www.deltadentalins.com/provider-tools/v2/eligibility-benefits'
        };
        const safe = async (p) => { try { const r = await p; return await this.parseJsonSafe(r); } catch { return null; } };

        const [pkg, maxDed, wait, addl, hist, mails, persons] = await Promise.all([
            api.get('/provider-tools/v2/api/benefits/benefits-package',            { headers }),
            api.get('/provider-tools/v2/api/benefits/maximums-deductibles',        { headers }),
            api.get('/provider-tools/v2/api/benefits/waiting-periods',             { headers }),
            api.get('/provider-tools/v2/api/benefits/additional-benefits',         { headers }),
            api.get('/provider-tools/v2/api/treatment-history',                    { headers }),
            api.get('/provider-tools/v2/api/eligibility/claim-mailing-addresses',  { headers }),
            api.get('/provider-tools/v2/api/eligibility/persons',                  { headers }),
        ]);
        return { pkg:await safe(pkg), maxDed:await safe(maxDed), wait:await safe(wait), addl:await safe(addl),
                 hist:await safe(hist), mails:await safe(mails), persons:await safe(persons) };
    }

    async getClaims(api, enrolleeId) {
        try {
            const resp = await api.get('/provider-tools/v2/api/claims', {
                params: {
                    practiceLocationId: this.plocId || '',
                    timePeriod: 12,
                    pageNumber: 1,
                    pageSize: 50,
                    claimTransactionType: 'All Claims'
                },
                headers: enrolleeId ? { enrolleeid: String(enrolleeId) } : undefined
            });
            return await this.parseJsonSafe(resp);
        } catch (e) {
            const resp = await api.post('/provider-tools/v2/api/claim/search', {
                data: { searchTerm: enrolleeId, pageNumber: 1, pageSize: 50 }
            });
            return await this.parseJsonSafe(resp);
        }
    }

    async extractPatientData(patient, onLog = console.log, retryCount = 0) {
        // Extract enrolleeId from patient object
        const enrolleeId = (patient && (
            patient.subscriberId || 
            patient.enrolleeId || 
            patient.memberId || 
            ''
        ).toString()).trim();
        
        if (!enrolleeId) {
            throw new Error('Missing subscriberId/enrolleeId');
        }

        if (!fs.existsSync(this.storageStatePath)) {
            // No session, try auto-login if first attempt
            if (retryCount === 0) {
                onLog('   📍 No session found, attempting auto-login...');
                const loginSuccess = await this.tryAutoLogin(onLog);
                if (loginSuccess) {
                    onLog('   ✅ Auto-login successful!');
                    return await this.extractPatientData(patient, onLog, retryCount + 1);
                }
            }
            throw new Error(`No session found at ${this.storageStatePath}. Please run login first.`);
        }

        const api = await this.makeApiContext(onLog);
        await this.resolvePlocId(api, onLog);
        
        onLog(`🔍 Extracting DDINS for ${patient.firstName || ''} ${patient.lastName || ''} (${enrolleeId})`);

        // Check session (robust, sans PLOC puis avec)
        try {
            await this.checkSession(api, onLog);
            onLog('   ✓ Session validated');
        } catch (e) {
            if (e && e.code === 'HTML_RESPONSE') {
                onLog('   ⚠️ Session expired.');

                // Auto-retry with fresh login if first attempt
                if (retryCount === 0) {
                    await api.dispose();
                    onLog('   🔄 Attempting automatic re-login...');

                    const loginSuccess = await this.tryAutoLogin(onLog);
                    if (loginSuccess) {
                        onLog('   ✅ Re-login successful, retrying extraction...');
                        return await this.extractPatientData(patient, onLog, retryCount + 1);
                    }
                }

                throw new Error('DDINS session expired. Please run: node ddins/auto-login.js');
            }
            onLog('   ⚠️ Session check failed, continuing anyway...');
        }

        // Fetch Eligibility Bundle
        let eligibility = null;
        try {
            eligibility = await this.getEligibilityBundle(api, enrolleeId);
            onLog('   ✓ Eligibility bundle fetched');
        } catch (e) {
            onLog(`   ⚠️ Eligibility failed: ${e.message}`);
            if (e && e.code === 'HTML_RESPONSE') {
                // Auto-retry with fresh login if first attempt
                if (retryCount === 0) {
                    await api.dispose();
                    onLog('   🔄 Session expired, attempting automatic re-login...');

                    const loginSuccess = await this.tryAutoLogin(onLog);
                    if (loginSuccess) {
                        onLog('   ✅ Re-login successful, retrying extraction...');
                        return await this.extractPatientData(patient, onLog, retryCount + 1);
                    }
                }
                throw new Error('Session expired during eligibility fetch');
            }
        }

        // Fetch Claims
        let claims = [];
        try {
            const claimsResp = await this.getClaims(api, enrolleeId);
            claims = Array.isArray(claimsResp?.claims) ? claimsResp.claims : 
                     (Array.isArray(claimsResp?.data) ? claimsResp.data : 
                     (Array.isArray(claimsResp) ? claimsResp : []));
            onLog(`   ✓ Claims fetched (${claims.length})`);
        } catch (e) {
            onLog(`   ⚠️ Claims failed: ${e.message}`);
            if (e.code === 'HTML_RESPONSE') {
                // Auto-retry with fresh login if first attempt
                if (retryCount === 0) {
                    await api.dispose();
                    onLog('   🔄 Session expired, attempting automatic re-login...');

                    const loginSuccess = await this.tryAutoLogin(onLog);
                    if (loginSuccess) {
                        onLog('   ✅ Re-login successful, retrying extraction...');
                        return await this.extractPatientData(patient, onLog, retryCount + 1);
                    }
                }
                throw new Error('Session expired during claims fetch');
            }
        }

        // Close API context
        await api.dispose();

        // Build summary
        const totalClaims = Array.isArray(claims) ? claims.length : 0;
        
        // Extract key eligibility info if available
        let planMaximum = null;
        let maximumUsed = null;
        let maximumRemaining = null;
        let deductible = null;

        if (eligibility && eligibility.maxDed) {
            planMaximum = eligibility.maxDed.planMaximum ?? eligibility.maxDed.maximum;
            maximumUsed = eligibility.maxDed.maximumUsed;
            maximumRemaining = eligibility.maxDed.maximumRemaining;
            deductible = eligibility.maxDed.deductible ?? eligibility.maxDed.deductibles;
        }

        return {
            portal: 'DeltaDentalINS',
            extractionDate: new Date().toISOString(),
            patient: {
                subscriberId: enrolleeId,
                firstName: (patient.firstName || '').toUpperCase(),
                lastName: (patient.lastName || '').toUpperCase(),
                dateOfBirth: patient.dateOfBirth || null
            },
            eligibility: eligibility,  // Raw JSON response
            claims: claims,           // Raw JSON response
            summary: {
                patientName: `${(patient.firstName || '').toUpperCase()} ${(patient.lastName || '').toUpperCase()}`.trim(),
                memberId: enrolleeId,
                totalClaims: totalClaims,
                planMaximum: planMaximum,
                maximumUsed: maximumUsed,
                maximumRemaining: maximumRemaining,
                deductible: deductible
            }
        };
    }

    // Simplified bulk extraction - just reads from patients.ndjson
    async extractBulkPatients(onLog = console.log, maxPatients = 10) {
        const patientsFile = path.join(__dirname, '..', 'data', 'ddins', 'patients.ndjson');
        
        if (!fs.existsSync(patientsFile)) {
            throw new Error('No patients file found. Please run DDINS extractor first.');
        }

        const lines = fs.readFileSync(patientsFile, 'utf8')
            .split('\n')
            .filter(line => line.trim())
            .slice(0, maxPatients);

        const patients = [];
        for (const line of lines) {
            try {
                const data = JSON.parse(line);
                if (data.roster) {
                    patients.push({
                        enrolleeId: data.enrolleeId,
                        firstName: data.roster.firstName,
                        lastName: data.roster.lastName,
                        dateOfBirth: data.roster.dateOfBirth,
                        memberId: data.roster.card?.memberId
                    });
                }
            } catch (e) {
                onLog(`Failed to parse patient line: ${e.message}`);
            }
        }

        onLog(`🚀 Starting bulk extraction for ${patients.length} patients`);
        
        const results = [];
        for (let i = 0; i < patients.length; i++) {
            const patient = patients[i];
            onLog(`\n[${i + 1}/${patients.length}] Processing ${patient.firstName} ${patient.lastName}`);
            
            try {
                const data = await this.extractPatientData({
                    subscriberId: patient.enrolleeId || patient.memberId,
                    firstName: patient.firstName,
                    lastName: patient.lastName,
                    dateOfBirth: patient.dateOfBirth
                }, onLog);
                
                results.push(data);
            } catch (e) {
                onLog(`   ❌ Failed: ${e.message}`);
                results.push({
                    error: e.message,
                    patient: patient
                });
            }
        }

        return {
            portal: 'DeltaDentalINS',
            mode: 'bulk',
            extractionDate: new Date().toISOString(),
            totalPatients: patients.length,
            successCount: results.filter(r => !r.error).length,
            failureCount: results.filter(r => r.error).length,
            patients: results
        };
    }
    async close() {
        // Method for compatibility with monitoring
        // DDINS uses stateless API, nothing to close
        return Promise.resolve();
    }
}

module.exports = DDINSService;