const { google } = require('googleapis');
const cron = require('node-cron');
const { db, admin } = require('../../firebase/init');
const { applicationTypes, submissions, pollerState, blacklist } = require('../../firebase/collections');
const { createApplicationThread } = require('../../utils/threadManager');
const { getClient } = require('../../utils/botClient');
const config = require('../../config/config');

async function getSheetsClient() {
  let auth;
  const serviceAccountPath = require('../../config/config').firebase.serviceAccountPath;

  if (require('fs').existsSync(serviceAccountPath)) {
    auth = new google.auth.GoogleAuth({
      keyFile: serviceAccountPath,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });
  } else if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    const credentials = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });
  } else {
    throw new Error('No Google Sheets credentials found (neither file nor environment variable).');
  }

  return google.sheets({ version: 'v4', auth });
}

async function pollDepartment(appType) {
  try {
    const sheets = await getSheetsClient();
    const range = 'Sheet1!A:ZZ';
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: appType.sheetId,
      range: range,
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) return 0;

    const headers = rows[0];
    const dataRows = rows.slice(1);

    // Auto-detect columns
    let discordIdCol = -1;
    let robloxCol = -1;

    headers.forEach((header, index) => {
      const h = header.toLowerCase();
      if (h.includes('discord') && h.includes('id')) {
        discordIdCol = index;
      } else if (h.includes('roblox')) {
        robloxCol = index;
      }
    });

    // Fallback for discordIdCol
    if (discordIdCol === -1) {
      headers.forEach((header, index) => {
        if (header.toLowerCase().includes('discord')) {
          discordIdCol = index;
        }
      });
    }

    if (discordIdCol === -1) {
      console.warn(`[Poller] Could not find Discord ID column in ${appType.name} sheet. Applicant cannot be identified.`);
      return 0;
    }

    const stateDoc = await pollerState.doc(appType.id).get();
    const lastRowSeen = stateDoc.exists ? stateDoc.data().lastRowSeen : 1;
    let newSubmissionsCount = 0;

    for (let i = 0; i < dataRows.length; i++) {
      const rowIndex = i + 1; // 1-indexed data rows
      if (rowIndex <= lastRowSeen) continue;

      const row = dataRows[i];
      const discordTag = row[discordIdCol];
      const robloxUsername = robloxCol !== -1 ? row[robloxCol] : null;

      if (!discordTag) continue;

      // Extract discordId if tag is like "User#0001" or just the ID
      const discordId = discordTag.match(/^\d{17,19}$/) ? discordTag : null;

      // Check blacklist
      if (discordId) {
        const blacklisted = await blacklist.doc(discordId).get();
        if (blacklisted.exists) {
          console.log(`[Poller] Skipped blacklisted applicant in ${appType.name}`);
          continue;
        }
      }

      // Build rawFormData
      const rawFormData = {};
      headers.forEach((header, index) => {
        rawFormData[header] = row[index] || '';
      });

      // Prevent duplicate submissions by sheetRowIndex
      const existing = await submissions
        .where('appTypeId', '==', appType.id)
        .where('sheetRowIndex', '==', rowIndex)
        .get();

      if (existing.empty) {
        const submission = {
          discordId,
          discordTag,
          robloxUsername,
          appTypeId: appType.id,
          appTypeName: appType.name,
          status: 'GRADING',
          denialReason: null,
          acceptanceNotes: null,
          reviewedById: null,
          reviewedByTag: null,
          reviewedAt: null,
          sheetRowIndex: rowIndex,
          rawFormData,
          forumThreadId: null,
          submittedAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };

        const docRef = await submissions.add(submission);

        try {
          const threadId = await createApplicationThread({ ...submission, id: docRef.id }, appType, rawFormData);
          await docRef.update({ forumThreadId: threadId });
        } catch (e) {
          console.error(`[Poller] Error creating thread for ${appType.name} row ${rowIndex}: ${e.message}`);
        }

        newSubmissionsCount++;
      }
    }

    await pollerState.doc(appType.id).set({ lastRowSeen: dataRows.length }, { merge: true });
    return newSubmissionsCount;

  } catch (error) {
    console.error(`[Poller] Error reading ${appType.name}: ${error.message}`);
    return 0;
  }
}

async function runAllPolls() {
  const appTypesSnapshot = await applicationTypes.where('enabled', '==', true).get();
  let totalNew = 0;

  for (const doc of appTypesSnapshot.docs) {
    const appType = { id: doc.id, ...doc.data() };
    totalNew += await pollDepartment(appType);
  }

  return totalNew;
}

function startPoller(client) {
  // Initial poll
  runAllPolls().then(count => {
    console.log(`[Poller] Startup poll complete. Found ${count} new submissions.`);
  });

  // Every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    const count = await runAllPolls();
    console.log(`[Poller] Scheduled poll complete. Found ${count} new submissions.`);
  });
}

module.exports = {
  startPoller,
  runAllPolls
};
