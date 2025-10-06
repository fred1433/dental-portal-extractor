/**
 * Session Store - Manages Playwright sessions per clinic and portal
 *
 * Structure: sessions/<clinicId>/<portal>/storageState.json
 *
 * This allows multiple clinics to have separate sessions for the same portal
 * without overwriting each other.
 */

const fs = require('fs');
const path = require('path');

const SESSION_ROOT = process.env.SESSION_DIR || path.join(process.cwd(), 'sessions');

/**
 * Get session directory path for a clinic/portal combination
 */
function getSessionDir(clinicId, portal) {
  if (!clinicId || !portal) {
    throw new Error('clinicId and portal are required');
  }
  return path.join(SESSION_ROOT, clinicId, portal);
}

/**
 * Get session file path
 */
function getSessionPath(clinicId, portal) {
  return path.join(getSessionDir(clinicId, portal), 'storageState.json');
}

/**
 * Load Playwright session state for a clinic/portal
 * Returns null if no session exists
 */
function loadSession(clinicId, portal) {
  try {
    const sessionPath = getSessionPath(clinicId, portal);
    if (!fs.existsSync(sessionPath)) {
      return null;
    }
    const content = fs.readFileSync(sessionPath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.warn(`Failed to load session for ${clinicId}/${portal}:`, error.message);
    return null;
  }
}

/**
 * Save Playwright session state for a clinic/portal
 */
function saveSession(clinicId, portal, storageState) {
  try {
    const sessionDir = getSessionDir(clinicId, portal);
    const sessionPath = getSessionPath(clinicId, portal);

    // Create directory if it doesn't exist
    fs.mkdirSync(sessionDir, { recursive: true, mode: 0o700 });

    // Save session with restricted permissions
    const content = typeof storageState === 'string'
      ? storageState
      : JSON.stringify(storageState, null, 2);

    fs.writeFileSync(sessionPath, content, { mode: 0o600 });

    return sessionPath;
  } catch (error) {
    console.error(`Failed to save session for ${clinicId}/${portal}:`, error.message);
    throw error;
  }
}

/**
 * Delete session for a clinic/portal
 */
function deleteSession(clinicId, portal) {
  try {
    const sessionPath = getSessionPath(clinicId, portal);
    if (fs.existsSync(sessionPath)) {
      fs.unlinkSync(sessionPath);
      return true;
    }
    return false;
  } catch (error) {
    console.warn(`Failed to delete session for ${clinicId}/${portal}:`, error.message);
    return false;
  }
}

/**
 * Check if session exists for a clinic/portal
 */
function sessionExists(clinicId, portal) {
  const sessionPath = getSessionPath(clinicId, portal);
  return fs.existsSync(sessionPath);
}

/**
 * List all sessions for a clinic
 */
function listSessions(clinicId) {
  try {
    const clinicDir = path.join(SESSION_ROOT, clinicId);
    if (!fs.existsSync(clinicDir)) {
      return [];
    }
    return fs.readdirSync(clinicDir);
  } catch (error) {
    return [];
  }
}

module.exports = {
  loadSession,
  saveSession,
  deleteSession,
  sessionExists,
  listSessions,
  getSessionPath,
  getSessionDir
};
