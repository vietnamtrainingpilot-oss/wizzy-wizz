const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const { firebase: { serviceAccountPath, projectId } } = require('../config/config');

function initializeFirebase() {
  if (admin.apps.length) return admin.firestore();

  let serviceAccount;

  try {
    // Method 1: Try to load from the provided file path
    const absolutePath = path.resolve(serviceAccountPath);
    if (fs.existsSync(absolutePath)) {
      console.log(`[Firebase] Loading credentials from: ${absolutePath}`);
      serviceAccount = require(absolutePath);
    } else {
      console.warn(`[Firebase] Service account file NOT found at ${absolutePath}. Checking environment variables...`);
    }
  } catch (e) {
    console.error(`[Firebase] Error reading service account file: ${e.message}`);
  }

  // Method 2: Fallback to Environment Variable (for hosts where files are tricky)
  if (!serviceAccount && process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    try {
      console.log(`[Firebase] Loading credentials from environment variable...`);
      serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    } catch (e) {
      console.error(`[Firebase] Environment variable FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON: ${e.message}`);
    }
  }

  if (!serviceAccount) {
    console.error('-------------------------------------------------------------------');
    console.error('CRITICAL ERROR: Firebase credentials not found!');
    console.error('1. Ensure credentials/firebase-service-account.json exists.');
    console.error('2. Or add FIREBASE_SERVICE_ACCOUNT_JSON variable to your panel.');
    console.error('-------------------------------------------------------------------');
    process.exit(1);
  }

  try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: projectId
    });
    console.log(`[Firebase] Successfully connected to project: ${projectId}`);
  } catch (e) {
    console.error(`[Firebase] Initialization failed: ${e.message}`);
    process.exit(1);
  }

  return admin.firestore();
}

const db = initializeFirebase();
module.exports = { db, admin };
