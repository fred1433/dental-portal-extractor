const express = require('express');
const path = require('path');
const DNOAService = require('./dnoa/dnoa-service');
const DentaQuestService = require('./dentaquest-html-scraping/dentaquest-service');
const fs = require('fs');
const MetLifeService = require('./metlife/metlife-service');
const CignaService = require('./cigna/cigna-service');
const DOTService = require('./dot-extractor/dot-service');
const DDINSService = require('./ddins/DDINSApiClient');
const monitor = require('./monitor');
const cron = require('node-cron');
const checkLocation = require('./us-location-checker');
const JsonQueryEngine = require('./chat/json-query-engine');
const { generateQueries, generateAnswer } = require('./chat/gemini-client');
const { spawn } = require('child_process');
const { savePatient, getPatientByFileName, listPatients } = require('./db/mongodb-client');
require('dotenv').config();

// Simple rate limiter for chat (100 questions/day)
const chatUsage = {
  count: 0,
  date: new Date().toDateString()
};

function checkChatLimit() {
  const today = new Date().toDateString();

  // Reset counter if new day
  if (chatUsage.date !== today) {
    chatUsage.count = 0;
    chatUsage.date = today;
  }

  // Check limit
  const DAILY_LIMIT = 50;
  if (chatUsage.count >= DAILY_LIMIT) {
    return { allowed: false, remaining: 0 };
  }

  chatUsage.count++;
  return { allowed: true, remaining: DAILY_LIMIT - chatUsage.count };
}

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Simple API key protection
const API_KEY = process.env.API_KEY || 'demo2024secure';

// Load clinic credentials from environment variables
let CLINIC_CONFIGS = {};

/**
 * Load clinic credentials from .env file
 * Convention: {CLINIC}_{PORTAL}_USERNAME and {CLINIC}_{PORTAL}_PASSWORD
 * Example: SDB_DDINS_USERNAME, ACE_DENTAL_UHC_PASSWORD
 */
function loadClinicConfigs() {
  try {
    const portals = ['DDINS', 'DNOA', 'MetLife', 'Cigna', 'DentaQuest', 'DOT', 'UHC', 'MCNA', 'Availity'];

    CLINIC_CONFIGS = {
      'sdb': {
        name: 'SDB Dental',
        portals: {}
      },
      'ace_dental': {
        name: 'Ace Dental Heights',
        portals: {}
      },
      'eagleriver': {
        name: 'Eagle River Dental',
        portals: {}
      }
    };

    // Load SDB credentials
    portals.forEach(portal => {
      const usernameKey = `SDB_${portal.toUpperCase()}_USERNAME`;
      const passwordKey = `SDB_${portal.toUpperCase()}_PASSWORD`;

      if (process.env[usernameKey] || process.env[passwordKey]) {
        CLINIC_CONFIGS.sdb.portals[portal] = {
          username: process.env[usernameKey] || '',
          password: process.env[passwordKey] || ''
        };
      }
    });

    // Load ACE DENTAL credentials
    portals.forEach(portal => {
      const usernameKey = `ACE_DENTAL_${portal.toUpperCase()}_USERNAME`;
      const passwordKey = `ACE_DENTAL_${portal.toUpperCase()}_PASSWORD`;

      if (process.env[usernameKey] || process.env[passwordKey]) {
        CLINIC_CONFIGS.ace_dental.portals[portal] = {
          username: process.env[usernameKey] || '',
          password: process.env[passwordKey] || ''
        };
      }
    });

    // Load EAGLE RIVER credentials
    portals.forEach(portal => {
      const usernameKey = `EAGLERIVER_${portal.toUpperCase()}_USERNAME`;
      const passwordKey = `EAGLERIVER_${portal.toUpperCase()}_PASSWORD`;

      if (process.env[usernameKey] || process.env[passwordKey]) {
        CLINIC_CONFIGS.eagleriver.portals[portal] = {
          username: process.env[usernameKey] || '',
          password: process.env[passwordKey] || ''
        };
      }
    });

    const sdbPortalCount = Object.keys(CLINIC_CONFIGS.sdb.portals).length;
    const acePortalCount = Object.keys(CLINIC_CONFIGS.ace_dental.portals).length;
    const eagleRiverPortalCount = Object.keys(CLINIC_CONFIGS.eagleriver.portals).length;

    console.log(`✅ Loaded clinic credentials from .env`);
    console.log(`   - SDB Dental: ${sdbPortalCount} portals configured`);
    console.log(`   - ACE Dental: ${acePortalCount} portals configured`);
    console.log(`   - Eagle River Dental: ${eagleRiverPortalCount} portals configured`);
  } catch (error) {
    console.error('❌ Error loading clinic credentials:', error);
    CLINIC_CONFIGS = {};
  }
}

// Load configs on startup
loadClinicConfigs();

// Active SSE connections
const sseClients = new Set();

// Middleware for API key check
function checkApiKey(req, res, next) {
  const key = req.query.key || req.headers['x-api-key'];
  if (key !== API_KEY) {
    return res.status(401).json({ error: 'Invalid API key' });
  }
  next();
}

// SSE endpoint for real-time logs
app.get('/api/stream', checkApiKey, (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  // Send initial connection message
  res.write('event: connected\ndata: {"message": "Connected to log stream"}\n\n');
  
  // Add to clients set
  sseClients.add(res);
  
  // Remove on disconnect
  req.on('close', () => {
    sseClients.delete(res);
  });
});

// Broadcast log to all SSE clients
function broadcastLog(message) {
  const data = JSON.stringify({ 
    message, 
    timestamp: new Date().toISOString() 
  });
  
  for (const client of sseClients) {
    client.write(`event: log\ndata: ${data}\n\n`);
  }
}

// Main extraction endpoint
app.post('/api/extract', checkApiKey, async (req, res) => {
  const { subscriberId, dateOfBirth, firstName, lastName, portal = 'DNOA', mode, patients, clinicId,
          appointmentDate, appointmentTime } = req.body;
  
  // Skip validation for bulk modes
  const isDDINSBulk = portal?.toLowerCase() === 'ddins' && mode === 'bulk';
  const isDNOABulk = portal?.toLowerCase() === 'dnoa' && mode === 'bulk';
  const isBulkMode = isDDINSBulk || isDNOABulk;
  const portalLower = portal?.toLowerCase();

  // DNOA and DOT don't require names (just Member ID + DOB)
  const needsNames = !(
    portalLower === 'dnoa' ||
    portalLower === 'dot' ||
    portalLower === 'uhc' ||
    portalLower === 'unitedhealthcare'
  );

  // Validation for bulk mode
  if (isDNOABulk) {
    if (!patients || !Array.isArray(patients) || patients.length === 0) {
      return res.status(400).json({
        error: 'No patients provided for bulk extraction'
      });
    }
  }
  // Validation for single mode
  else if (!isBulkMode && (!subscriberId || !dateOfBirth || (needsNames && (!firstName || !lastName)))) {
    return res.status(400).json({
      error: 'Missing required fields: subscriberId, dateOfBirth' + (needsNames ? ', firstName, lastName' : '')
    });
  }
  
  // Handle DNOA bulk mode
  if (isDNOABulk) {
    broadcastLog(`🚀 Starting DNOA bulk extraction for ${patients.length} patients`);
    const DNOABulkHandler = require('./dnoa/dnoa-bulk-handler');
    const bulkHandler = new DNOABulkHandler();

    try {
      // Format patients dates if needed
      const formattedPatients = patients.map(p => {
        let formattedDob = p.dateOfBirth;
        if (p.dateOfBirth && p.dateOfBirth.includes('/')) {
          const [month, day, year] = p.dateOfBirth.split('/');
          formattedDob = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        }
        return {
          subscriberId: p.subscriberId.trim(),
          dateOfBirth: formattedDob,
          firstName: '',
          lastName: ''
        };
      });

      const bulkResult = await bulkHandler.processBulk(formattedPatients, broadcastLog);

      // Send complete event
      for (const client of sseClients) {
        client.write(`event: complete\ndata: {"message": "Bulk extraction complete"}\n\n`);
      }

      return res.json({
        success: true,
        mode: 'bulk',
        data: bulkResult
      });
    } catch (error) {
      broadcastLog(`❌ Bulk extraction error: ${error.message}`);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Skip patient object creation for DDINS bulk mode
  let patient = null;
  if (!isBulkMode) {
    // Format date if needed (MM/DD/YYYY to YYYY-MM-DD)
    let formattedDob = dateOfBirth;
    if (dateOfBirth && dateOfBirth.includes('/')) {
      const [month, day, year] = dateOfBirth.split('/');
      formattedDob = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }

    patient = {
      subscriberId: subscriberId.trim(),
      dateOfBirth: formattedDob,
      firstName: firstName ? firstName.trim().toUpperCase() : '',
      lastName: lastName ? lastName.trim().toUpperCase() : ''
    };

    // Display patient info appropriately based on available data
    const patientDisplay = patient.firstName && patient.lastName
      ? `${patient.firstName} ${patient.lastName}`
      : `Member ID: ${patient.subscriberId}`;
    broadcastLog(`🚀 Starting ${portal} extraction for ${patientDisplay}`);
  } else if (isDDINSBulk) {
    broadcastLog(`🚀 Starting ${portal} bulk extraction`);
  }
  
  // Get credentials for the selected clinic and portal
  let credentials = null;
  if (clinicId && CLINIC_CONFIGS[clinicId]) {
    const portalKey = portal.toUpperCase();
    if (portalKey === 'DELTADENTALINS') {
      credentials = CLINIC_CONFIGS[clinicId].portals['DDINS'];
    } else {
      credentials = CLINIC_CONFIGS[clinicId].portals[portalKey];
    }
    if (credentials) {
      broadcastLog(`🏥 Using credentials for ${CLINIC_CONFIGS[clinicId].name}`);
    }
  }

  // Select service based on portal (case-insensitive)
  let service;

  if (portalLower === 'dentaquest') {
    service = new DentaQuestService(credentials);
  } else if (portalLower === 'metlife') {
    service = new MetLifeService(credentials);
  } else if (portalLower === 'cigna') {
    service = new CignaService(credentials);
  } else if (portalLower === 'dnoa') {
    service = new DNOAService({ credentials, clinicId });
  } else if (portalLower === 'dot') {
    service = new DOTService(credentials);
  } else if (portalLower === 'ddins' || portalLower === 'deltadentalins') {
    const storageStatePath = clinicId
      ? path.join(__dirname, 'ddins', '.ddins-session', `${clinicId}-storageState.json`)
      : undefined; // Fallback to default if no clinicId
    service = new DDINSService({ credentials, storageStatePath });
  } else if (portalLower === 'uhc' || portalLower === 'unitedhealthcare') {
    const UHCService = require('./UHC/uhc-extractor');
    service = new UHCService(credentials);
  } else {
    return res.status(400).json({
      success: false,
      error: `Unknown portal: ${portal}. Valid options are: DentaQuest, MetLife, Cigna, DNOA, DOT, DDINS, UHC`
    });
  }
  
  try {
    // Initialize with headless mode
    const isHeadless = portalLower !== 'metlife'; // MetLife in visible mode for debugging
    
    if (portalLower === 'metlife') {
      // MetLife needs OTP handler
      let otpPromiseResolve = null;
      const otpPromise = new Promise(resolve => { otpPromiseResolve = resolve; });
      
      // Store OTP resolver for later use
      req.app.locals.otpResolvers = req.app.locals.otpResolvers || {};
      req.app.locals.otpResolvers[req.id || Date.now()] = otpPromiseResolve;
      
      await service.initialize(isHeadless, broadcastLog, async () => {
        broadcastLog('🔔 OTP Required! Please enter the 6-digit code sent to pa****@sdbmail.com');
        broadcastLog('⏸️ Waiting for OTP input...');
        
        // Send event to frontend to show OTP input
        for (const client of sseClients) {
          client.write(`event: otp_required\ndata: {"message": "Enter OTP code"}\n\n`);
        }
        
        // Wait for OTP from frontend
        const otp = await otpPromise;
        broadcastLog('🔐 OTP received');
        return otp;
      });
    } else if (portalLower === 'cigna') {
      // Cigna also needs OTP handler
      let otpPromiseResolve = null;
      const otpPromise = new Promise(resolve => { otpPromiseResolve = resolve; });
      
      // Store OTP resolver for later use
      req.app.locals.otpResolvers = req.app.locals.otpResolvers || {};
      req.app.locals.otpResolvers[req.id || Date.now()] = otpPromiseResolve;
      
      await service.initialize(isHeadless, broadcastLog, async () => {
        broadcastLog('🔔 Cigna OTP Required! Please enter the 6-digit verification code');
        broadcastLog('⏸️ Waiting for OTP input...');
        
        // Send event to frontend to show OTP input
        for (const client of sseClients) {
          client.write(`event: otp_required\ndata: {"message": "Enter Cigna OTP code"}\n\n`);
        }
        
        // Wait for OTP from frontend
        const otp = await otpPromise;
        broadcastLog('🔐 OTP received');
        return otp;
      });
    } else if (portalLower !== 'ddins') {
      // Skip initialize for DDINS (uses API context instead)
      await service.initialize(isHeadless, broadcastLog);
    }
    
    // === CAPTURE EXTRACTION METADATA ===
    const extractionMetadata = {
      clinic: clinicId ? (CLINIC_CONFIGS[clinicId]?.name || clinicId) : 'Unknown',
      clinicId: clinicId || null,
      portal: portal, // Display name (e.g., "Delta Dental INS")
      portalCode: portalLower.toUpperCase(), // Technical code (e.g., "DDINS")
      mode: req.body.mode || 'single',
      date: new Date().toISOString(),
      version: '1.0'
    };

    // Extract data
    let data;
    if (portalLower === 'metlife') {
      const result = await service.extractPatientData(
        patient.subscriberId,
        patient.lastName,
        patient.dateOfBirth,
        patient.firstName,
        broadcastLog
      );
      if (!result.success) {
        throw new Error(result.error);
      }
      
      // Transform MetLife data to match expected format
      const metlifeData = result.data;
      data = {
        summary: {
          patientName: `${metlifeData.patient.firstName} ${metlifeData.patient.lastName}`,
          memberId: metlifeData.patient.subscriberId,
          planMaximum: metlifeData.eligibility?.basicPlan?.planMaximum || 'N/A',
          maximumUsed: metlifeData.eligibility?.basicPlan?.maximumUsed || 'N/A',
          maximumRemaining: metlifeData.eligibility?.basicPlan?.maximumRemaining || 'N/A',
          deductible: metlifeData.eligibility?.basicPlan?.deductible || 'N/A',
          deductibleMet: metlifeData.eligibility?.basicPlan?.deductibleMet || 'N/A',
          network: metlifeData.eligibility?.patientInfo?.network || 'N/A'
        },
        claims: metlifeData.claims || [],
        eligibility: metlifeData.eligibility,
        patient: metlifeData.patient,
        timestamp: metlifeData.timestamp
      };
    } else if (portalLower === 'cigna') {
      // Cigna retourne directement le format avec summary
      data = await service.extractPatientData(patient, broadcastLog);
    // Bulk mode temporarily disabled
    // } else if (portalLower === 'ddins' && req.body.mode === 'bulk') {
    //   // DDINS bulk extraction mode - limited to 10 for web interface
    //   const maxPatients = Math.min(10, process.env.MAX_PATIENTS ? parseInt(process.env.MAX_PATIENTS) : 10);
    //   data = await service.extractBulkPatients(broadcastLog, maxPatients);
    } else {
      data = await service.extractPatientData(patient, broadcastLog);
    }

    // === INJECT EXTRACTION METADATA into data ===
    // Restructure to put metadata FIRST (extraction, then patient, then rest)
    if (data && typeof data === 'object') {
      const restructuredData = {
        extraction: extractionMetadata,
        patient: data.patient || {
          firstName: (patient.firstName || '').toUpperCase(),
          lastName: (patient.lastName || '').toUpperCase(),
          subscriberId: patient.subscriberId || null,
          dateOfBirth: patient.dateOfBirth || null
        },
        ...data  // Spread rest of data after
      };

      // Remove duplicate patient if it was in original data
      delete restructuredData.patient;
      restructuredData.patient = data.patient || {
        firstName: (patient.firstName || '').toUpperCase(),
        lastName: (patient.lastName || '').toUpperCase(),
        subscriberId: patient.subscriberId || null,
        dateOfBirth: patient.dateOfBirth || null
      };

      data = restructuredData;
    }

    // === ADD OPTIONAL PMS APPOINTMENT DATA ===
    if (appointmentDate || appointmentTime) {
      data.appointment = {
        date: appointmentDate || null,
        time: appointmentTime || null
      };
    }

    // === SAVE TO MONGODB ===
    try {
      await savePatient(data);

      const patientName = `${data.patient?.firstName || ''} ${data.patient?.lastName || ''}`.trim();
      const portal = data.extraction?.portalCode || data.portal;
      broadcastLog(`💾 Saved to MongoDB: ${patientName} (${portal})`);
    } catch (saveError) {
      broadcastLog(`⚠️ Warning: Could not save to MongoDB: ${saveError.message}`);
      // Don't fail the request if save fails
    }

    // Send complete event to SSE clients
    for (const client of sseClients) {
      client.write(`event: complete\ndata: {"message": "Extraction complete"}\n\n`);
    }

    res.json({
      success: true,
      data
    });
    
  } catch (error) {
    console.error('Full error details:', error);
    broadcastLog('❌ Error: ' + error.message);
    
    // Add more context for MetLife errors
    if (portalLower === 'metlife' && error.message.includes('authentication')) {
      broadcastLog('⚠️ MetLife authentication issues in production are known - session cookies are not portable between environments');
      broadcastLog('💡 Solution: Need to implement direct authentication on production server');
    }
    
    // Send error event to SSE clients
    for (const client of sseClients) {
      client.write(`event: error\ndata: {"error": "${error.message}"}\n\n`);
    }
    
    // Return 401 for DDINS session errors
    const isSessionError = /session expired|No valid DDINS session|HTML_RESPONSE/i.test(error.message || '');
    const status = (portalLower === 'ddins' && isSessionError) ? 401 : 500;
    
    res.status(status).json({
      success: false,
      error: error.message,
      portal: portal,
      details: process.env.NODE_ENV === 'production' ? undefined : error.stack
    });
    
  } finally {
    // DDINS doesn't use browser automation, so no close method
    if (service.close) {
      await service.close();
    }
    
    // If MetLife and trace was recorded, include trace info in response
    if (portalLower === 'metlife' && service.getLastTraceFile) {
      const traceFile = service.getLastTraceFile();
      if (traceFile) {
        const filename = path.basename(traceFile);
        broadcastLog(`🎬 Trace available: /api/trace/${filename}?key=${API_KEY}`);
      }
    }
  }
});

// Submit OTP endpoint
app.post('/api/submit-otp', (req, res) => {
  const { otp } = req.body;
  const apiKey = req.query.key;
  
  if (apiKey !== API_KEY) {
    return res.status(401).json({ error: 'Invalid API key' });
  }
  
  if (!otp || !/^\d{6}$/.test(otp)) {
    return res.status(400).json({ error: 'Invalid OTP format - must be 6 digits' });
  }
  
  // Find and resolve the OTP promise
  const resolvers = req.app.locals.otpResolvers || {};
  const resolverKeys = Object.keys(resolvers);
  
  if (resolverKeys.length > 0) {
    // Resolve the most recent OTP request
    const latestKey = resolverKeys[resolverKeys.length - 1];
    const resolver = resolvers[latestKey];
    resolver(otp);
    delete resolvers[latestKey];
    
    res.json({ success: true, message: 'OTP submitted' });
  } else {
    res.status(400).json({ error: 'No pending OTP request' });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// DOT health check
app.get('/api/health/dot', checkApiKey, async (req, res) => {
  try {
    const service = new DOTService();
    await service.initialize(true, () => {}); // Silent logging
    
    // Check if session exists and is valid
    const isLoggedIn = await service.ensureLoggedIn(() => {});
    
    if (isLoggedIn) {
      // Try to create API client to verify session works
      try {
        const { createDotApi, closeApi } = require('./dot-extractor/dist/sdk/dotClient');
        const api = await createDotApi(path.join(__dirname, 'dot-extractor', 'dot-storage.json'));
        await closeApi(api);
        
        res.json({ 
          status: 'OK',
          message: 'DOT session is valid',
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        res.json({
          status: 'NEED_LOGIN',
          message: 'Session expired - Bearer token needs refresh',
          timestamp: new Date().toISOString()
        });
      }
    } else {
      res.json({
        status: 'NEED_LOGIN',
        message: 'No session found - login required',
        timestamp: new Date().toISOString()
      });
    }
    
    await service.close();
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Location check endpoint
app.get('/api/location', async (req, res) => {
  const location = await checkLocation();
  res.json(location);
});

// Download trace files
app.get('/api/trace/:filename', (req, res) => {
  const { filename } = req.params;
  const apiKey = req.query.key;
  
  // Check API key
  if (apiKey !== API_KEY) {
    return res.status(401).json({ error: 'Invalid API key' });
  }
  
  // Security: only allow .zip files in the current directory
  if (!filename.endsWith('.zip') || filename.includes('..') || filename.includes('/')) {
    return res.status(400).json({ error: 'Invalid filename' });
  }
  
  const filePath = path.join(__dirname, filename);
  
  // Check if file exists
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Trace file not found' });
  }
  
  // Send file
  res.download(filePath, filename, (err) => {
    if (err) {
      console.error('Error sending trace file:', err);
      res.status(500).json({ error: 'Failed to send trace file' });
    }
  });
});

// List available traces
app.get('/api/traces', (req, res) => {
  const apiKey = req.query.key;
  
  if (apiKey !== API_KEY) {
    return res.status(401).json({ error: 'Invalid API key' });
  }
  
  const traceFiles = fs.readdirSync(__dirname)
    .filter(file => file.startsWith('metlife-trace-') && file.endsWith('.zip'))
    .map(file => {
      const stats = fs.statSync(path.join(__dirname, file));
      return {
        filename: file,
        size: stats.size,
        created: stats.mtime,
        downloadUrl: `/api/trace/${file}?key=${API_KEY}`
      };
    })
    .sort((a, b) => b.created - a.created);
  
  res.json({ traces: traceFiles });
});

// Monitoring endpoints
app.get('/api/monitor/status', checkApiKey, async (req, res) => {
  try {
    const status = await monitor.getLatestStatus();
    res.json({ status });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/monitor/history', checkApiKey, async (req, res) => {
  try {
    const hours = parseInt(req.query.hours) || 24;
    const history = await monitor.getHistory(hours);
    res.json({ history });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint to trigger manual test
app.post('/api/monitor/test', checkApiKey, async (req, res) => {
  try {
    console.log('📋 Manual monitoring test triggered');
    const results = await monitor.runAllTests();
    res.json({ success: true, results });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Serve monitoring page (no API key check for HTML page itself)
app.get('/monitor', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'monitor.html'));
});

// DDINS health check (session + pt-userid + ploc)
app.get('/api/health/ddins', checkApiKey, async (req, res) => {
  try {
    const DDINSService = require('./ddins/DDINSApiClient');
    const service = new DDINSService();
    const logs = [];
    const log = (m) => logs.push(m);
    const api = await service.makeApiContext(log);
    try {
      await service.checkSession(api, log);
      await api.dispose();
      res.json({
        status: 'OK',
        ptUserId: service.ptUserId || null,
        plocId: service.plocId || null,
        logs,
        timestamp: new Date().toISOString()
      });
    } catch (e) {
      await api.dispose();
      res.status(500).json({
        status: 'ERROR',
        error: e.message,
        logs,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    res.status(500).json({ status: 'ERROR', error: error.message });
  }
});

// Get list of clinics
app.get('/api/clinics', checkApiKey, (req, res) => {
  const clinics = Object.entries(CLINIC_CONFIGS).map(([id, config]) => ({
    id,
    name: config.name,
    portals: Object.keys(config.portals)
  }));
  res.json({ clinics });
});

// Get specific patient (MongoDB only)
app.get('/api/patients/:fileName', checkApiKey, async (req, res) => {
  try {
    const { fileName } = req.params;

    // Get from MongoDB
    const patient = await getPatientByFileName(fileName);

    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    res.json(patient);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get list of saved patients (MongoDB only)
app.get('/api/patients', checkApiKey, async (req, res) => {
  try {
    const portal = req.query.portal; // Optional: filter by portal (DDINS, DentaQuest, etc.)
    const clinic = req.query.clinic; // Optional: filter by clinic (sdb, ace_dental)

    console.log(`[API] GET /api/patients - portal: ${portal || 'ALL'}, clinic: ${clinic || 'NONE'}`);

    // Get from MongoDB with timeout protection (increased for Atlas from Brazil)
    let mongoPatients = [];
    try {
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('MongoDB query timeout')), 60000)
      );
      const queryPromise = listPatients(portal);
      mongoPatients = await Promise.race([queryPromise, timeoutPromise]);
    } catch (dbError) {
      console.error(`[ERROR] MongoDB query failed: ${dbError.message}`);
      // Return empty list if DB fails - don't crash the whole endpoint
      return res.json({
        patients: [],
        total: 0,
        error: 'Database temporarily unavailable',
        details: dbError.message
      });
    }

    console.log(`[DEBUG] /api/patients - Found ${mongoPatients.length} patients in MongoDB`);

    // Filter by clinic if provided
    let filteredPatients = mongoPatients;
    if (clinic) {
      filteredPatients = mongoPatients.filter(data => {
        const dataClinicId = (data.extraction?.clinicId || '').toLowerCase();
        const dataClinic = (data.extraction?.clinic || '').toLowerCase();
        const searchClinic = clinic.toLowerCase();

        // Match by clinicId (e.g., "sdb") OR clinic name contains search term (e.g., "SDB Dental" contains "sdb")
        return dataClinicId === searchClinic || dataClinic.includes(searchClinic);
      });
      console.log(`[DEBUG] After clinic filter: ${filteredPatients.length} patients`);
    }

    const formattedPatients = filteredPatients.map(data => {
      const subscriberId = data.patient?.subscriberId || '';
      const firstName = data.patient?.firstName || 'Unknown';
      const lastName = data.patient?.lastName || 'Unknown';
      const portalCode = data.extraction?.portalCode || data.portal || 'UNKNOWN';
      const fileName = `${subscriberId}_${firstName}_${lastName}_${portalCode}.json`;

      return {
        fileName,
        firstName: data.patient?.firstName || 'Unknown',
        lastName: data.patient?.lastName || 'Unknown',
        subscriberId: data.patient?.subscriberId || '',
        dateOfBirth: data.patient?.dateOfBirth || '',
        portal: data.extraction?.portalCode || data.portal || 'Unknown',
        clinic: data.extraction?.clinic || 'Unknown',
        extractionDate: data.extraction?.date || data.extractionDate || null
      };
    });

    console.log(`[DEBUG] Returning ${formattedPatients.length} formatted patients`);
    res.json({ patients: formattedPatients, total: formattedPatients.length });
  } catch (error) {
    console.error(`[ERROR] /api/patients failed:`, error);
    res.status(500).json({ error: error.message });
  }
});

// Get credentials for a specific clinic and portal
app.get('/api/clinic/:clinicId/credentials', checkApiKey, (req, res) => {
  const { clinicId } = req.params;
  const { portal } = req.query;

  if (!CLINIC_CONFIGS[clinicId]) {
    return res.status(404).json({ error: 'Clinic not found' });
  }

  const clinic = CLINIC_CONFIGS[clinicId];

  if (portal) {
    if (!clinic.portals[portal]) {
      return res.status(404).json({ error: 'Portal not configured for this clinic' });
    }
    return res.json({
      credentials: clinic.portals[portal],
      clinicName: clinic.name,
      portal
    });
  }

  // Return all portal credentials for the clinic
  res.json({
    clinicName: clinic.name,
    portals: clinic.portals
  });
});

// Update credentials for a clinic
// NOTE: Credentials are now managed in .env file only
app.post('/api/clinic/:clinicId/credentials', checkApiKey, (req, res) => {
  res.status(501).json({
    error: 'Credential updates via API are disabled',
    message: 'Credentials must be updated directly in the .env file using the format: {CLINIC}_{PORTAL}_USERNAME and {CLINIC}_{PORTAL}_PASSWORD',
    examples: [
      'SDB_DDINS_USERNAME=your_username',
      'SDB_DDINS_PASSWORD=your_password',
      'ACE_DENTAL_UHC_USERNAME=your_username',
      'ACE_DENTAL_UHC_PASSWORD=your_password'
    ],
    note: 'After updating .env, restart the server to load new credentials'
  });
});

// Chat endpoint - Answer dentist questions using LLM + JSON queries
app.post('/api/chat', checkApiKey, async (req, res) => {
  // Check rate limit first
  const rateCheck = checkChatLimit();
  if (!rateCheck.allowed) {
    return res.status(429).json({
      success: false,
      error: 'Daily chat limit reached (50 questions/day). Please try again tomorrow.',
      limitReached: true
    });
  }

  const { question, fileName, history = [] } = req.body;

  if (!question) {
    return res.status(400).json({ error: 'Missing question' });
  }

  if (!fileName) {
    return res.status(400).json({ error: 'Missing fileName' });
  }

  const startTime = Date.now();

  try {
    // 1. Load patient JSON from MongoDB
    const patientData = await getPatientByFileName(fileName);

    if (!patientData) {
      return res.status(404).json({ error: 'Patient not found in database' });
    }

    // 2. Write temporary JSON file for Python script (Python needs a file path)
    const tempJsonPath = path.join(__dirname, 'data', 'patients', fileName);
    fs.mkdirSync(path.dirname(tempJsonPath), { recursive: true });
    fs.writeFileSync(tempJsonPath, JSON.stringify(patientData, null, 2), 'utf8');

    // 3. Generate structure using Python script
    const structureFile = path.join(__dirname, 'data', 'patients', `${fileName.replace('.json', '')}_structure.txt`);

    // Check if structure already exists
    let structure;
    if (fs.existsSync(structureFile)) {
      structure = fs.readFileSync(structureFile, 'utf8');
    } else {
      // Generate structure
      structure = await new Promise((resolve, reject) => {
        const python = spawn('python3', [
          'extract_unique_paths.py',
          tempJsonPath
        ]);

        let output = '';
        python.stdout.on('data', data => output += data);
        python.stderr.on('data', data => console.error('Python stderr:', data.toString()));

        python.on('close', code => {
          if (code === 0 && fs.existsSync(structureFile)) {
            resolve(fs.readFileSync(structureFile, 'utf8'));
          } else {
            reject(new Error('Failed to generate structure'));
          }
        });

        setTimeout(() => python.kill(), 60000); // 60s timeout
      });
    }

    // 3. LLM #1: Generate queries (with conversation history)
    const patientAge = new JsonQueryEngine(patientData).patientAge;
    const queryGenResult = await generateQueries(structure, question, patientAge, history);

    // 4. Execute queries
    const queryEngine = new JsonQueryEngine(patientData);
    const queryResults = queryEngine.executeQueries(queryGenResult.queries);

    // 5. LLM #2: Generate answer (with conversation history)
    const answerResult = await generateAnswer(question, queryGenResult.queries, queryResults, history);

    const totalTime = Date.now() - startTime;

    // 6. Return response
    res.json({
      success: true,
      question,
      answer: answerResult.answer,
      metadata: {
        patientName: `${patientData.patient?.firstName} ${patientData.patient?.lastName}`,
        patientAge,
        portal: patientData.extraction?.portalCode || patientData.portal,
        queriesGenerated: queryGenResult.queries.length,
        queriesExecuted: queryResults.length,
        timing: {
          queryGeneration: queryGenResult.elapsed,
          queryExecution: 0, // Instant (in-memory)
          answerGeneration: answerResult.elapsed,
          total: totalTime
        },
        models: {
          queryGen: queryGenResult.model,
          answer: answerResult.model
        }
      },
      debug: {
        queries: queryGenResult.queries,
        queryResults
      }
    });

  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Export verification form to PDF
app.get('/api/export-pdf/:fileName', checkApiKey, async (req, res) => {
  const { fileName } = req.params;

  try {
    // 1. Load patient data from MongoDB
    const patientData = await getPatientByFileName(fileName);

    if (!patientData) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    console.log(`📄 Generating PDF for ${fileName}...`);

    // 2. Spawn Python script with Playwright (use venv Python)
    const pythonPath = path.join(__dirname, '.venv', 'bin', 'python3');
    const python = spawn(pythonPath, [
      path.join(__dirname, 'export_pdf.py'),
      fileName,
      API_KEY,
      `http://localhost:${PORT}`
    ]);

    // Write patient data to stdin (script reads it)
    python.stdin.write(JSON.stringify(patientData));
    python.stdin.end();

    let pdfPath = '';
    let errorOutput = '';

    python.stdout.on('data', data => {
      pdfPath += data.toString();
    });

    python.stderr.on('data', data => {
      errorOutput += data.toString();
      console.error('PDF generation stderr:', data.toString());
    });

    python.on('close', code => {
      if (code === 0 && pdfPath.trim()) {
        const trimmedPath = pdfPath.trim();

        // Check if file exists
        if (!fs.existsSync(trimmedPath)) {
          return res.status(500).json({
            error: 'PDF file not found after generation',
            path: trimmedPath
          });
        }

        console.log(`✅ PDF generated: ${trimmedPath}`);

        // Send PDF file to user
        res.download(trimmedPath, fileName.replace('.json', '.pdf'), (err) => {
          if (err) {
            console.error('Error sending PDF:', err);
            if (!res.headersSent) {
              res.status(500).json({ error: 'Failed to send PDF' });
            }
          }

          // Clean up temp file after sending
          try {
            fs.unlinkSync(trimmedPath);
            console.log(`🗑️ Cleaned up temp file: ${trimmedPath}`);
          } catch (cleanupErr) {
            console.error('Warning: Failed to delete temp PDF:', cleanupErr.message);
          }
        });
      } else {
        console.error(`❌ PDF generation failed with code ${code}`);
        res.status(500).json({
          error: 'PDF generation failed',
          exitCode: code,
          details: errorOutput || 'No error details available'
        });
      }
    });

    // Timeout after 60 seconds
    setTimeout(() => {
      python.kill();
      console.error('⏱️ PDF generation timeout (60s)');
    }, 60000);

  } catch (error) {
    console.error('Export PDF error:', error);
    res.status(500).json({
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Direct patient link - shareable URL to pre-filled verification form
app.get('/patient/:subscriberId/:portal', checkApiKey, async (req, res) => {
  const { subscriberId, portal } = req.params;

  try {
    // Get patient data from MongoDB using subscriberId + portal
    const { connect } = require('./db/mongodb-client');
    const database = await connect();

    if (!database) {
      throw new Error('Database not available');
    }

    const collection = database.collection('patients');
    const patientData = await collection.findOne({
      'patient.subscriberId': subscriberId,
      'extraction.portalCode': portal.toUpperCase()
    });

    if (!patientData) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html>
          <head><title>Patient Not Found</title></head>
          <body style="font-family: system-ui; padding: 2rem; max-width: 600px; margin: 0 auto;">
            <h1>❌ Patient Not Found</h1>
            <p>No data found for:</p>
            <ul>
              <li><strong>Subscriber ID:</strong> ${subscriberId}</li>
              <li><strong>Portal:</strong> ${portal}</li>
            </ul>
            <p><a href="/?key=${req.query.key || API_KEY}">← Back to Search</a></p>
          </body>
        </html>
      `);
    }

    // Create a redirect page that sets sessionStorage then redirects to verification form
    const apiKey = req.query.key || process.env.API_KEY;

    // Determine which form HTML to use based on clinicId
    const clinicId = patientData.extraction?.clinicId || 'default';
    let formFile = 'master-verification-form.html'; // Default/fallback

    if (clinicId === 'ace_dental') {
      formFile = 'ace-verification-form.html';
    } else if (clinicId === 'sdb') {
      formFile = 'sdb-verification-form.html';
    }

    const redirectHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Loading Patient Data...</title>
        <script>
          // Store patient data in sessionStorage
          sessionStorage.setItem('extractedPatientData', ${JSON.stringify(JSON.stringify(patientData))});
          // Redirect to clinic-specific verification form with autoFill parameter
          window.location.href = '/${formFile}?autoFill=true&key=${apiKey}';
        </script>
      </head>
      <body>
        <p>Loading patient data...</p>
      </body>
      </html>
    `;

    res.send(redirectHtml);

  } catch (error) {
    console.error('Error loading patient:', error);
    res.status(500).send(`
      <!DOCTYPE html>
      <html>
        <head><title>Error</title></head>
        <body style="font-family: system-ui; padding: 2rem;">
          <h1>❌ Error Loading Patient</h1>
          <p>${error.message}</p>
          <p><a href="/?key=${req.query.key || API_KEY}">← Back to Search</a></p>
        </body>
      </html>
    `);
  }
});

// Serve the main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, async () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  
  // Only show API key in development
  if (process.env.NODE_ENV !== 'production') {
    console.log(`📝 API Key: ${API_KEY}`);
    console.log(`🔗 Access URL: http://localhost:${PORT}/?key=${API_KEY}`);
    console.log(`📊 Monitor URL: http://localhost:${PORT}/monitor?key=${API_KEY}`);
  } else {
    console.log(`🔒 Server running in production mode`);
  }
  
  // Check location for VPN warning
  await checkLocation();
  
  // Schedule monitoring every 6 hours (at 0:00, 6:00, 12:00, 18:00)
  cron.schedule('0 */6 * * *', async () => {
    console.log('\n⏰ Scheduled monitoring run started');
    try {
      await monitor.runAllTests();
    } catch (error) {
      console.error('❌ Scheduled monitoring failed:', error.message);
    }
  });
  
  console.log('⏰ Monitoring scheduled to run every 6 hours (00:00, 06:00, 12:00, 18:00)');
  
  // Run initial test on startup only in production
  if (process.env.NODE_ENV === 'production') {
    setTimeout(async () => {
      console.log('\n🚀 Running initial monitoring test on startup...');
      try {
        await monitor.runAllTests();
        console.log('✅ Initial monitoring test completed');
      } catch (error) {
        console.error('❌ Initial monitoring test failed:', error.message);
      }
    }, 5000); // Wait 5 seconds for server to be fully ready
  } else {
    console.log('📊 Monitoring startup test skipped (local development mode)');
  }
});
