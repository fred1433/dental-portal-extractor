/* eslint-disable no-console */
const { chromium, request } = require('playwright');
const fs = require('fs');
const path = require('path');

/**
 * Shared authentication manager for all portals
 * Implements auto-relogin and session persistence
 */
class AuthManager {
  constructor(options) {
    this.baseURL = options.baseURL;
    this.storageStatePath = options.storageStatePath;
    this.portalName = options.portalName || 'Portal';
    this.defaultHeaders = options.defaultHeaders || {};
    this.healthCheck = options.healthCheck;
    this.loginFlow = options.loginFlow;
    this.onLog = options.onLog || console.log;
    this.reloginAttempted = false;
    this.api = null;
  }

  async createApi() {
    // Dispose of existing API context if any
    if (this.api) {
      await this.api.dispose();
      this.api = null;
    }

    const contextOptions = {
      baseURL: this.baseURL,
      extraHTTPHeaders: this.defaultHeaders
    };

    // Load storage state if it exists
    if (fs.existsSync(this.storageStatePath)) {
      contextOptions.storageState = this.storageStatePath;
      this.onLog(`🍪 Loading saved session from ${path.basename(this.storageStatePath)}`);
    }

    this.api = await request.newContext(contextOptions);
    return this.api;
  }

  async ensureSession() {
    // Create or reuse API context
    if (!this.api) {
      await this.createApi();
    }

    // Check if session is valid
    this.onLog(`🔍 Checking ${this.portalName} session...`);
    const isValid = await this.healthCheck(this.api);
    
    if (isValid) {
      this.onLog(`✅ ${this.portalName} session is valid`);
      return this.api;
    }

    // Session invalid, attempt relogin once
    if (this.reloginAttempted) {
      throw new Error(`${this.portalName} authentication failed after relogin attempt`);
    }

    this.onLog(`🔄 ${this.portalName} session expired, attempting relogin...`);
    this.reloginAttempted = true;

    // Run login flow
    const loginResult = await this.loginFlow();
    
    // Save any additional data from login (like PT User ID)
    if (loginResult.additionalData) {
      this.defaultHeaders = { ...this.defaultHeaders, ...loginResult.additionalData };
    }

    // Recreate API with new session
    await this.createApi();
    
    // Verify session after login
    const isValidAfterLogin = await this.healthCheck(this.api);
    if (!isValidAfterLogin) {
      throw new Error(`${this.portalName} authentication failed - session invalid after login`);
    }

    this.onLog(`✅ ${this.portalName} relogin successful`);
    return this.api;
  }

  async withAutoRelogin(apiCall) {
    try {
      return await apiCall();
    } catch (error) {
      const status = error?.status || error?.response?.status || 0;
      
      // If 401/403 and haven't retried yet, attempt relogin
      if ((status === 401 || status === 403) && !this.reloginAttempted) {
        this.onLog(`⚠️ Got ${status} error, attempting automatic relogin...`);
        this.reloginAttempted = true;
        
        // Relogin
        await this.loginFlow();
        await this.createApi();
        
        // Retry the API call
        return await apiCall();
      }
      
      throw error;
    }
  }

  async dispose() {
    if (this.api) {
      await this.api.dispose();
      this.api = null;
    }
  }

  // Helper to save storage state from browser context
  static async saveStorageState(context, storagePath) {
    await context.storageState({ path: storagePath });
    console.log(`💾 Session saved to ${path.basename(storagePath)}`);
  }

  // Helper for interactive login with timeout
  static async waitForLogin(page, successSelector, timeoutMs = 180000) {
    console.log('⏳ Waiting for manual login...');
    console.log('   Please complete the login process in the browser window');
    
    try {
      await page.waitForSelector(successSelector, { timeout: timeoutMs });
      console.log('✅ Login successful!');
      return true;
    } catch (error) {
      console.log('❌ Login timeout - please try again');
      return false;
    }
  }
}

module.exports = AuthManager;