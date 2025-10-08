/**
 * MongoDB Client - Manages connection and patient operations
 */

const { MongoClient } = require('mongodb');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI;
let client = null;
let db = null;

async function connect() {
  if (db) return db; // Already connected

  if (!MONGODB_URI) {
    console.warn('⚠️ MONGODB_URI not set - using file-based storage');
    return null;
  }

  try {
    console.log('🔌 Attempting MongoDB connection...');

    // Add timeout options (increased for Atlas connection from Brazil)
    client = new MongoClient(MONGODB_URI, {
      serverSelectionTimeoutMS: 30000,  // 30 second timeout
      connectTimeoutMS: 30000,          // 30 second connection timeout
      socketTimeoutMS: 60000            // 60 second socket timeout
    });

    await client.connect();
    db = client.db('dental-verification');

    console.log('✅ MongoDB connected:', db.databaseName);

    // Create indexes for fast queries
    const indexOptions = { maxTimeMS: 30000 };
    await db.collection('patients').createIndex({ 'patient.subscriberId': 1 }, indexOptions);
    await db.collection('patients').createIndex({ 'extraction.portalCode': 1 }, indexOptions);
    await db.collection('patients').createIndex({ 'extraction.date': -1 }, indexOptions);

    return db;
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    console.error('Full error:', error);
    db = null;
    client = null;
    return null;
  }
}

async function disconnect() {
  if (client) {
    await client.close();
    client = null;
    db = null;
  }
}

/**
 * Save patient data
 */
async function savePatient(patientData) {
  const database = await connect();
  if (!database) return null; // Fallback to file-based

  const collection = database.collection('patients');

  // Upsert based on unique identifier
  const subscriberId = patientData.patient?.subscriberId;
  const portalCode = patientData.extraction?.portalCode || patientData.portal;

  if (!subscriberId || !portalCode) {
    throw new Error('Missing subscriberId or portalCode');
  }

  const result = await collection.updateOne(
    {
      'patient.subscriberId': subscriberId,
      'extraction.portalCode': portalCode
    },
    { $set: patientData },
    { upsert: true }
  );

  return result;
}

/**
 * Get patient by fileName (for backwards compatibility)
 */
async function getPatientByFileName(fileName) {
  const database = await connect();
  if (!database) return null;

  // Parse fileName: 002175461802_ESTELLE_MAZET_DDINS.json
  const parts = fileName.replace('.json', '').split('_');
  const subscriberId = parts[0];
  const portalCode = parts[parts.length - 1];

  const collection = database.collection('patients');
  return await collection.findOne({
    'patient.subscriberId': subscriberId,
    'extraction.portalCode': portalCode
  });
}

/**
 * List all patients (with optional portal filter)
 */
async function listPatients(portal = null) {
  const database = await connect();
  if (!database) return [];

  const collection = database.collection('patients');
  const query = portal ? { 'extraction.portalCode': portal.toUpperCase() } : {};

  return await collection
    .find(query)
    .sort({ 'extraction.date': -1 })
    .toArray();
}

module.exports = {
  connect,
  disconnect,
  savePatient,
  getPatientByFileName,
  listPatients
};
