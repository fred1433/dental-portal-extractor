const express = require('express');
const path = require('path');
const DNOAService = require('./dnoa-service');
const DentaQuestService = require('./dentaquest-service');
const fs = require('fs');
const MetLifeService = require('./metlife-service');
const CignaService = require('./cigna-service');
const DOTService = require('./dot-service');
const monitor = require('./monitor');
const cron = require('node-cron');
const checkLocation = require('./check-location');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Simple API key protection
const API_KEY = process.env.API_KEY || 'demo2024secure';

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
  const { subscriberId, dateOfBirth, firstName, lastName, portal = 'DNOA' } = req.body;
  
  // Validation
  if (!subscriberId || !dateOfBirth || !firstName || !lastName) {
    return res.status(400).json({ 
      error: 'Missing required fields: subscriberId, dateOfBirth, firstName, lastName' 
    });
  }
  
  // Format date if needed (MM/DD/YYYY to YYYY-MM-DD)
  let formattedDob = dateOfBirth;
  if (dateOfBirth.includes('/')) {
    const [month, day, year] = dateOfBirth.split('/');
    formattedDob = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  
  const patient = {
    subscriberId: subscriberId.trim(),
    dateOfBirth: formattedDob,
    firstName: firstName.trim().toUpperCase(),
    lastName: lastName.trim().toUpperCase()
  };
  
  broadcastLog(`🚀 Starting ${portal} extraction for ${patient.firstName} ${patient.lastName}`);
  
  // Select service based on portal (case-insensitive)
  let service;
  const portalLower = portal.toLowerCase();
  
  if (portalLower === 'dentaquest') {
    service = new DentaQuestService();
  } else if (portalLower === 'metlife') {
    service = new MetLifeService();
  } else if (portalLower === 'cigna') {
    service = new CignaService();
  } else if (portalLower === 'dnoa') {
    service = new DNOAService();
  } else if (portalLower === 'dot') {
    service = new DOTService();
  } else {
    return res.status(400).json({ 
      success: false, 
      error: `Unknown portal: ${portal}. Valid options are: DentaQuest, MetLife, Cigna, DNOA, DOT` 
    });
  }
  
  try {
    // Initialize with headless mode
    const isHeadless = true; // Headless pour production
    
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
    } else {
      await service.initialize(isHeadless, broadcastLog);
    }
    
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
    } else {
      data = await service.extractPatientData(patient, broadcastLog);
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
    
    res.status(500).json({
      success: false,
      error: error.message,
      portal: portal,
      details: process.env.NODE_ENV === 'production' ? undefined : error.stack
    });
    
  } finally {
    await service.close();
    
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

// Serve the main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
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