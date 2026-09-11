require('dotenv').config();
const fs = require('fs');
const path = require('path');

const requiredEnvVars = [
  'DISCORD_TOKEN',
  'CLIENT_ID',
  'CLIENT_SECRET',
  'GUILD_ID',
  'FORUM_CHANNEL_ID',
  'RESULTS_CHANNEL_ID',
  'SESSION_SECRET',
  'DASHBOARD_PORT',
  'DASHBOARD_URL',
  'FIREBASE_SERVICE_ACCOUNT_PATH',
  'FIREBASE_PROJECT_ID',
  'SHEET_ID_FLIGHT_DECK',
  'SHEET_ID_GROUND_CREW',
  'SHEET_ID_CABIN_CREW',
  'SHEET_ID_FLIGHT_OPERATOR',
  'SHEET_ID_HUMAN_RESOURCES',
  'SHEET_ID_PUBLIC_RELATIONS',
  'SHEET_ID_HIGH_RANK'
];

function validateConfig() {
  const missing = requiredEnvVars.filter(varName => !process.env[varName]);

  if (missing.length > 0) {
    console.error('Missing required environment variables:');
    missing.forEach(varName => console.error(`- ${varName}`));
    console.error('\nPlease check your .env file.');
    process.exit(1);
  }

  const serviceAccountPath = path.resolve(process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
  if (!fs.existsSync(serviceAccountPath)) {
    console.error(`Firebase service account file not found at: ${serviceAccountPath}`);
    console.error('\n--- Setup Instructions ---');
    console.error('1. Go to https://console.firebase.google.com');
    console.error('2. Create a project called "wizz-air-ptfs-bot"');
    console.error('3. Go to Project Settings > Service Accounts > Generate new private key');
    console.error('4. Rename it to "firebase-service-account.json"');
    console.error('5. Place it in the credentials/ folder');
    process.exit(1);
  }
}

validateConfig();

module.exports = {
  discord: {
    token: process.env.DISCORD_TOKEN,
    clientId: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    guildId: process.env.GUILD_ID,
    forumChannelId: process.env.FORUM_CHANNEL_ID,
    resultsChannelId: process.env.RESULTS_CHANNEL_ID
  },
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID,
    serviceAccountPath: path.resolve(process.env.FIREBASE_SERVICE_ACCOUNT_PATH)
  },
  dashboard: {
    port: parseInt(process.env.DASHBOARD_PORT) || 3000,
    url: process.env.DASHBOARD_URL,
    sessionSecret: process.env.SESSION_SECRET
  },
  sheets: {
    FLIGHT_DECK: process.env.SHEET_ID_FLIGHT_DECK,
    GROUND_CREW: process.env.SHEET_ID_GROUND_CREW,
    CABIN_CREW: process.env.SHEET_ID_CABIN_CREW,
    FLIGHT_OPERATOR: process.env.SHEET_ID_FLIGHT_OPERATOR,
    HUMAN_RESOURCES: process.env.SHEET_ID_HUMAN_RESOURCES,
    PUBLIC_RELATIONS: process.env.SHEET_ID_PUBLIC_RELATIONS,
    HIGH_RANK: process.env.SHEET_ID_HIGH_RANK
  }
};
