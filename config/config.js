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

  // We removed the file check here because it was crashing when the path was missing.
  // The firebase/init.js now handles this safely.
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
    serviceAccountPath: process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './credentials/firebase-service-account.json'
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
