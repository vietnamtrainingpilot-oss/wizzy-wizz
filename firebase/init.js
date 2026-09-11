const admin = require('firebase-admin');
const { firebase: { serviceAccountPath } } = require('../config/config');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(require(serviceAccountPath)),
  });
}

const db = admin.firestore();

module.exports = { db, admin };
