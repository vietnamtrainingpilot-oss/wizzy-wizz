# Wizz Air PTFS — Discord Application Bot
# Claude Code Build Instructions

You are building a complete, production-ready Discord bot for **Wizz Air PTFS**,
a Roblox PTFS virtual airline Discord server.

Read every section before writing any code.
Build all files for real — do not describe what should exist, create it.

---

## CRITICAL RULES — READ FIRST

- Zero emojis anywhere. Not in embeds, not in messages, not in logs, not in the
  dashboard, not in button labels, not in thread titles. No Unicode emoji characters
  anywhere in the codebase or any output the bot produces.
- Branding: Wizz Air purple (#6F2DA8) and yellow (#FFCC00). No red, no default blue.
- Zero DM system. The bot never DMs any user, ever, for any reason. Not on acceptance,
  not on denial, not on blacklist, not on anything. Remove all DM logic.
- There is no /panel command and no /applied command. Users apply via an existing
  Google Form career embed already built by the server owner. The bot's job starts
  AFTER the user submits the Google Form.
- Applications come in via Google Forms. Responses are read from the linked Google Sheet.
  The bot polls each sheet every 5 minutes to detect new rows.
- Each new application is posted as a new thread in a Discord forum channel.
  Staff review the thread and click Accept or Deny. That is the entire flow.
- Firebase/Firestore is the database for everything. No SQLite.
- No emojis. This is the most important rule.

---

## TECH STACK

- Runtime: Node.js v18+
- Discord library: discord.js v14
- Database: Firebase Admin SDK (Firestore)
- Google Sheets: googleapis (Sheets API v4, same service account as Firebase)
- Web dashboard: Express.js + EJS
- Dashboard auth: Discord OAuth2 via passport + passport-discord
- Session: express-session
- Environment: dotenv

---

## THE 7 DEPARTMENTS

| # | Name | Google Sheet ID (from .env) |
|---|---|---|
| 1 | Flight Deck | 1FAIpQLSe9T4bR7o2tptwRpEOcCrGaNJAHBko75tnhYudqCPOqDObHTQ |
| 2 | Ground Crew | 1FAIpQLScwGw0VaTuXK8kNfYFDNAEfjF9W4S3bpLsBR9v2Xl9wwbISDQ |
| 3 | Cabin Crew | 1FAIpQLSfNyJlIaqTBbpjbFSYN7TY1ax3T5bZzSakSytJWsVsrCO5_Ag |
| 4 | Flight Operator | 1FAIpQLSdbN6jyS1Su99rbwkUEUhkF6xEh7e2To9WKGWlsdTGG76ATdQ |
| 5 | Human Resources | 1FAIpQLSfujYBo5br6kijWRS_I6J4n-zJguLNNM1DNJHsgGE7DLHf95A |
| 6 | Public Relations | 1FAIpQLSdS6RTNA0uLYjf75rWCYuS47dgRj7rKkhzgvKZDiohXUJCsYA |
| 7 | High-rank | 1FAIpQLSei5x_j0YNR-GDK25X8ELUXgVYvd8nKqRfL1fUonHnYNvmowQ |


---

## DISCORD ID AUTO-DETECTION

Do NOT hardcode Discord column names. Instead, auto-detect on every poll:

1. Read the header row of the sheet
2. Find the column whose header contains BOTH "discord" AND "id"
   (case-insensitive string match on the header text)
3. If no column matches both, fall back to any column containing "discord"
4. If still no match, set discord_id to null and log a warning:
   "[Poller] Could not find Discord ID column in [Department Name] sheet.
    Applicant cannot be identified. Check the form question text."

This means the bot works automatically for all 7 departments without any manual
column name configuration. No TODO placeholders needed.

---

## ENVIRONMENT VARIABLES

```env
# Discord
DISCORD_TOKEN=
CLIENT_ID=
CLIENT_SECRET=
GUILD_ID=

# Forum channel where application threads are posted
FORUM_CHANNEL_ID=

# Dashboard
SESSION_SECRET=
DASHBOARD_PORT=3000
DASHBOARD_URL=http://localhost:3000

# Firebase
FIREBASE_SERVICE_ACCOUNT_PATH=./credentials/firebase-service-account.json
FIREBASE_PROJECT_ID=

# Google Sheet IDs (from each sheet's URL)
SHEET_ID_FLIGHT_DECK=
SHEET_ID_GROUND_CREW=
SHEET_ID_CABIN_CREW=
SHEET_ID_FLIGHT_OPERATOR=
SHEET_ID_HUMAN_RESOURCES=
SHEET_ID_PUBLIC_RELATIONS=
SHEET_ID_HIGH_RANK=
```

---

## FIRESTORE STRUCTURE

### Collection: `applicationTypes`
One document per department. Seeded on first launch if empty.

```
{
  id: string (auto),
  name: string,               // "Flight Deck"
  sheetId: string,            // from .env
  cooldownDays: number,       // default 7
  enabled: boolean,           // default true
  createdAt: timestamp
}
```

Seed 7 documents from the departments table above.

### Collection: `submissions`
One document per form submission.

```
{
  id: string (auto),
  discordId: string | null,   // extracted from form, null if not found
  discordTag: string | null,  // raw value from the Discord column
  robloxUsername: string | null,
  appTypeId: string,          // Firestore doc ID of the applicationTypes entry
  appTypeName: string,        // denormalized for display
  status: string,             // "GRADING" | "ACCEPTED" | "DENIED" | "BLACKLISTED"
  denialReason: string | null,
  acceptanceNotes: string | null,
  reviewedById: string | null,
  reviewedByTag: string | null,
  reviewedAt: timestamp | null,
  sheetRowIndex: number,      // row number in the sheet (1-indexed from data rows)
  rawFormData: object,        // full key-value map of all Q&A from the sheet row
  forumThreadId: string | null,   // Discord thread ID
  submittedAt: timestamp,
  updatedAt: timestamp
}
```

### Collection: `pollerState`
One document per department, keyed by appTypeId.

```
{
  appTypeId: string,
  lastRowSeen: number   // highest sheet row already processed; default 1
}
```

Seed one doc per department with lastRowSeen = 1 on first launch.

### Collection: `blacklist`
One document per blacklisted user, document ID = discord_id.

```
{
  discordId: string,
  discordTag: string | null,
  reason: string,
  issuedBy: string,         // Discord tag of staff
  issuedAt: timestamp
}
```

### Collection: `serverConfig`
Single document with ID "main".

```
{
  staffRoleId: string,
  forumChannelId: string    // mirrors .env but overridable via /configure
}
```

### Collection: `dashboardTokens`
One document per token (ID = token string).

```
{
  discordId: string,
  expiresAt: timestamp,
  used: boolean
}
```

---

## GOOGLE SHEETS + FIREBASE SETUP INSTRUCTIONS

Include in README.md and print on first startup if credentials file is missing.

```
Setup Instructions

Firebase:
1. Go to https://console.firebase.google.com
2. Create a project called "wizz-air-ptfs-bot"
3. Go to Project Settings > Service Accounts
4. Click "Generate new private key" — a JSON file downloads
5. Rename it to "firebase-service-account.json"
6. Create a folder called "credentials" in the bot project root
7. Move the file into credentials/firebase-service-account.json
8. In Firebase console, go to Firestore Database and create a database
   (start in production mode, choose a region)
9. Copy the Project ID from Project Settings and paste into .env as FIREBASE_PROJECT_ID

Google Sheets:
1. In the same GCP project (linked to Firebase), go to https://console.cloud.google.com
2. Search for "Google Sheets API" and enable it
3. Open credentials/firebase-service-account.json and copy the "client_email" value
4. Go to EACH of your 7 Google Sheets
5. Click Share, paste the client_email, set to Viewer, click Send
6. Copy the Sheet ID from each URL:
   https://docs.google.com/spreadsheets/d/[SHEET_ID_HERE]/edit
7. Paste each Sheet ID into your .env file
```

---

## CORE FEATURE: GOOGLE SHEETS POLLER

File: `modules/poller/sheetsPoller.js`

### Startup

Call `startPoller(client)` from `index.js` after bot is ready.

### Poll loop

Run immediately on startup, then every 5 minutes.

For each ENABLED application type in Firestore:
  1. Get `lastRowSeen` from `pollerState/{appTypeId}`
  2. Fetch all rows from the sheet: range `Sheet1!A:ZZ`
  3. Row index 0 = headers. Rows 1+ = data.
  4. Auto-detect the Discord ID column using the logic above
  5. For each data row with index > lastRowSeen:
     a. Check if a submission with this sheetRowIndex already exists → skip if so
     b. Extract discord_id and discord_tag using detected column
     c. Extract roblox_username: find column whose header contains "roblox"
        (case-insensitive). If not found, set to null.
     d. Build rawFormData: object mapping every header to its value in this row
     e. Check if discordId is in the blacklist → if so, skip and log:
        "[Poller] Skipped blacklisted applicant in [Department]"
     f. Create submission document in Firestore (status: GRADING)
     g. Post forum thread (see below)
     h. Update pollerState.lastRowSeen to this row index
  6. If Sheets API throws: log the error and continue to next department

### Error handling

Never crash the bot on a poll error. All errors are caught and logged.
Log format: `[Poller] Error reading [Department Name]: [error message]`

---

## FORUM THREAD FORMAT

When a new application is detected, create a new thread in FORUM_CHANNEL_ID.

### Thread name
```
[Department Name] — [roblox_username or discord_tag or "Unknown Applicant"]
```

### First message (thread starter)

This message contains the applicant summary AND the Accept/Deny buttons.
It must be sent as the thread-creating message so buttons appear immediately.

Content (plain text embed, no emojis):

```
Department:   [appTypeName]
Applicant:    [discordTag or "Not detected"]
Discord ID:   [discordId or "Not available — identify manually"]
Roblox:       [robloxUsername or "Not provided"]
Submitted:    [Discord timestamp <t:unix:F>]
Status:       Grading
```

Color: #6F2DA8
Footer: Wizz Air PTFS

Buttons in an ActionRow below the embed:
  Button 1 — Label: "Accept"  — Style: Success  — Custom ID: `accept_{submissionFirestoreId}`
  Button 2 — Label: "Deny"    — Style: Danger   — Custom ID: `deny_{submissionFirestoreId}`

### Subsequent messages in the thread

After the thread is created, post additional messages containing all Q&A.

Format each question-answer pair as:
```
[Question text]
[Answer text]

```

Concatenate all pairs. If the total exceeds 1900 characters, split into
multiple messages so each is under 1900 characters. Never cut a Q&A pair
in half — always split between pairs.

If rawFormData is empty or null, post one message: "No form data available."

### Store thread ID

After creating the thread, update the submission document:
`forumThreadId = thread.id`

---

## BUTTON INTERACTIONS

Handle in `events/interactionCreate.js`.

### `accept_{submissionId}`

1. Staff only check — if not staff, reply ephemerally: "You do not have permission."
2. Show a Modal:
   - Title: "Accept Application"
   - Text input: label "Notes (optional)", style Paragraph, required false,
     custom ID "notes", placeholder "Any notes for the record..."
   - Modal custom ID: `modal_accept_{submissionId}`

### `modal_accept_{submissionId}`

1. Extract notes from modal (may be empty)
2. Fetch submission from Firestore
3. Update submission: status = ACCEPTED, acceptanceNotes = notes,
   reviewedById, reviewedByTag, reviewedAt, updatedAt
4. Edit the first message of the forum thread:
   - Update Status field: "Accepted"
   - Change embed color to #2ecc71 (green)
   - Disable both buttons (set disabled: true)
5. Post a follow-up message in the thread:
   ```
   Decision: Accepted
   Reviewed by: [staff tag]
   Notes: [notes or "None"]
   ```
6. Reply ephemerally: "Application accepted."

### `deny_{submissionId}`

1. Staff only check
2. Show a Modal:
   - Title: "Deny Application"
   - Text input: label "Reason for denial", style Paragraph, required true,
     custom ID "reason", placeholder "Provide a clear reason..."
   - Modal custom ID: `modal_deny_{submissionId}`

### `modal_deny_{submissionId}`

1. Extract reason — if empty, reply ephemerally: "A reason is required." and stop
2. Fetch submission from Firestore
3. Update submission: status = DENIED, denialReason = reason,
   reviewedById, reviewedByTag, reviewedAt, updatedAt
4. Edit the first message of the forum thread:
   - Update Status field: "Denied"
   - Change embed color to #e74c3c (red)
   - Disable both buttons
5. Post a follow-up message in the thread:
   ```
   Decision: Denied
   Reviewed by: [staff tag]
   Reason: [reason]
   ```
6. Reply ephemerally: "Application denied."

---

## SLASH COMMANDS

### `/careers-poll-now`
Staff only. Triggers an immediate poll of all enabled departments.
Reply ephemerally: "Polling all sheets now..."
After poll completes: edit the reply with how many new submissions were found.

### `/application view <search>`
Staff only.
- search: free text (Discord ID, Discord tag, or Roblox username)
- Search Firestore submissions for any match
- If multiple: show a list embed with each result (name, dept, status, date)
- If one: show full detail embed with all rawFormData as fields
  Include a link button to jump to the forum thread if forumThreadId exists

### `/application list [department] [status]`
Staff only. Paginated list (10/page).
Columns: Applicant, Department, Status, Submitted.
Optional filters via command options.

### `/application setstatus <id> <status> [reason]`
Staff only.
- id: Firestore document ID of the submission
- status: GRADING | ACCEPTED | DENIED | BLACKLISTED
- reason: required for DENIED and BLACKLISTED
Calls the same status update logic as buttons. Edits the forum thread embed.

### `/blacklist add <discord_id> <reason>`
Staff only. Adds to blacklist collection. No DM.

### `/blacklist remove <discord_id>`
Staff only. Removes from blacklist collection. No DM.

### `/blacklist view <discord_id>`
Staff only. Shows the blacklist entry.

### `/cooldown reset <discord_id> <department>`
Staff only. Finds most recent DENIED submission for this user + department,
sets reviewedAt to a date far in the past to clear the cooldown.

### `/configure set-staff-role <role>`
Admin only (ADMINISTRATOR permission).
Saves staffRoleId to serverConfig/main in Firestore.

### `/configure set-forum-channel <channel>`
Admin only. Saves forumChannelId to serverConfig/main.
Note: channel must be a Forum type channel in Discord.

### `/configure view`
Staff only. Shows current config from Firestore.

### `/dashboard`
Staff only. Generates one-time token (10 minutes), replies ephemerally
with a link button: label "Open Dashboard", url [DASHBOARD_URL]/auth/token?t=[token].

---

## WEB DASHBOARD

### Backend: `dashboard/app.js`

Express server with:
- EJS view engine
- Static files from `dashboard/public/`
- express-session
- passport + passport-discord (scope: identify, guilds.members.read)
  Verify: check staffRoleId from Firestore serverConfig/main
- requireAuth middleware
- Routes:
  - /auth            — auth.js
  - /                — overview.js
  - /applications    — applications.js
  - /app-manager     — appManager.js
  - /blacklist       — blacklist.js

### Routes

**auth.js**
- GET /auth/login       — passport redirect
- GET /auth/callback    — success → /, failure → /auth/error
- GET /auth/token?t=    — validate Firestore token, log in, redirect to /
- GET /auth/error       — error page: "Access denied. Staff role required."
- GET /auth/logout      — req.logout(), redirect to /auth/login

**overview.js**
- GET / — render overview.ejs with:
  - Total submissions, count per status, count per department
  - Last 20 submissions ordered by submittedAt desc

**applications.js**
- GET /applications — paginated (20/page), filter by dept + status + search
- POST /applications/status — AJAX: { id, status, reason }
  Calls same Firestore update + thread edit logic as button handlers
- GET /applications/:id — AJAX: full submission JSON including rawFormData

**appManager.js**
- GET /app-manager — all applicationTypes
- POST /app-manager/create — new type
- PUT /app-manager/:id — update
- DELETE /app-manager/:id — delete
- POST /app-manager/:id/toggle — toggle enabled

**blacklist.js**
- GET /blacklist — all blacklisted users
- POST /blacklist/add — { discordId, reason }
- DELETE /blacklist/:discordId — remove

---

## DASHBOARD FRONTEND

### Design System

```css
--purple:       #6F2DA8;
--purple-dark:  #4e1f78;
--purple-light: #9b5ed4;
--yellow:       #FFCC00;
--yellow-dark:  #c9a000;
--bg:           #0c0c12;
--surface:      #16161f;
--surface2:     #1e1e2a;
--border:       #2a2a3a;
--text:         #f0f0f8;
--text-muted:   #7777aa;
--green:        #2ecc71;
--red:          #e74c3c;
--grey:         #444466;
```

Google Fonts: Outfit (headings, 600/700) + Inter (body, 400/500).
Zero emojis in any HTML/EJS template.

### Status Badge Classes
```css
.badge-grading     { background: #c9a000; color: #000; }
.badge-accepted    { background: #27ae60; color: #fff; }
.badge-denied      { background: #c0392b; color: #fff; }
.badge-blacklisted { background: #333355; color: #aaa; }
```

### Views

**layout.ejs**
- Fixed dark sidebar (240px)
  - Top: "Wizz Air PTFS" in Outfit, purple left border accent
  - Nav: Overview, Applications, App Manager, Blacklist
  - Bottom: user tag + logout
- Main content with <%- body %>
- Toast container bottom-right

**overview.ejs**
- Stat cards: Total, Grading, Accepted, Denied, Blacklisted
- Per-department table with counts per status
- Recent activity: last 20 submissions

**applications.ejs**
- Filter bar: department dropdown, status dropdown, text search
- Table: Applicant (Discord tag), Roblox Username, Department, Status badge, Date, Actions
- Actions: View (side drawer with rawFormData as Q&A list), Change Status
  - Deny and Blacklist require a reason input before confirming
  - All actions via AJAX
- Pagination

**appManager.ejs**
- Table: Name, Sheet ID (truncated), Cooldown, Enabled toggle, Edit, Delete
- Add/Edit modal: Name, Sheet ID, Cooldown Days, Enabled
- No form URL fields — forms are external, bot only reads sheets
- Delete with confirmation dialog

**blacklist.ejs**
- Add form: Discord ID + Reason
- Table: Discord ID, Reason, Issued By, Date, Remove button

**style.css** — full CSS for the design system above including:
- Sidebar, main layout, cards, tables, badges, modals, toasts,
  toggle switches, forms, buttons, pagination, responsive mobile

**dashboard.js** — vanilla JS:
- showToast(msg, type)
- Modal open/close
- Applications: AJAX filter, status change, detail drawer showing all Q&A
- App Manager: AJAX CRUD + toggle
- Blacklist: AJAX add/remove
- Active nav link by path

---

## FILE STRUCTURE

```
wizz-air-bot/
├── index.js
├── deploy-commands.js
├── package.json
├── .env
├── .env.example
├── .gitignore
├── README.md
├── credentials/
│   └── firebase-service-account.json    (added manually)
├── config/
│   └── config.js                        (loads .env, validates all vars)
├── commands/
│   ├── staff/
│   │   ├── application.js
│   │   ├── blacklist.js
│   │   ├── cooldown.js
│   │   ├── careersPollNow.js
│   │   └── dashboard.js
│   └── configure.js
├── events/
│   ├── ready.js
│   └── interactionCreate.js
├── modules/
│   ├── poller/
│   │   └── sheetsPoller.js
│   └── applications/
│       └── statusManager.js
├── firebase/
│   ├── init.js                          (initializes Firebase Admin SDK)
│   └── collections.js                   (named Firestore collection refs)
├── utils/
│   ├── embeds.js
│   ├── permissions.js
│   ├── threadManager.js                 (creates/edits forum threads)
│   └── botClient.js
└── dashboard/
    ├── app.js
    ├── routes/
    │   ├── auth.js
    │   ├── overview.js
    │   ├── applications.js
    │   ├── appManager.js
    │   └── blacklist.js
    ├── views/
    │   ├── layout.ejs
    │   ├── overview.ejs
    │   ├── applications.ejs
    │   ├── appManager.ejs
    │   └── blacklist.ejs
    └── public/
        ├── style.css
        └── dashboard.js
```

---

## FIREBASE INIT

File: `firebase/init.js`

```js
const admin = require('firebase-admin');
const serviceAccount = require(process.env.FIREBASE_SERVICE_ACCOUNT_PATH);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: process.env.FIREBASE_PROJECT_ID
});

const db = admin.firestore();
module.exports = { db, admin };
```

File: `firebase/collections.js`

Export named references to all Firestore collections:
```js
const { db } = require('./init');
module.exports = {
  applicationTypes: db.collection('applicationTypes'),
  submissions:      db.collection('submissions'),
  pollerState:      db.collection('pollerState'),
  blacklist:        db.collection('blacklist'),
  serverConfig:     db.collection('serverConfig'),
  dashboardTokens:  db.collection('dashboardTokens')
};
```

---

## UTILS

**`utils/embeds.js`**
EmbedBuilder helpers. Color #6F2DA8, footer "Wizz Air PTFS". Zero emojis.
Export: successEmbed, errorEmbed, infoEmbed,
applicationSummaryEmbed(submission), statusEmbed(status).

**`utils/permissions.js`**
isStaff(member): checks staffRoleId from Firestore serverConfig/main.
staffOnly(interaction): replies with errorEmbed if not staff, returns boolean.

**`utils/threadManager.js`**
createApplicationThread(client, submission, appType, rawFormData):
  - Creates forum thread
  - Posts first message with summary embed + buttons
  - Posts subsequent messages with Q&A content
  - Returns thread ID

editThreadStatus(client, submission, newStatus, notes):
  - Fetches the forum thread by forumThreadId
  - Edits the first message embed: update Status field, update color, disable buttons
  - Posts a decision follow-up message in the thread

**`utils/botClient.js`**
Singleton: setClient(c), getClient().

---

## SEED DATA ON FIRST LAUNCH

In `index.js` or a `firebase/seed.js` module, on startup:

1. Check if applicationTypes collection is empty
2. If empty, create 7 documents with the 7 departments
3. Check if pollerState collection has docs for all 7 types
4. For any missing, create with lastRowSeen = 1
5. Check if serverConfig/main exists — if not, create with empty strings

---

## STARTUP VALIDATION

In `config/config.js`:
1. All required .env vars present — throw with clear message if any missing
2. Firebase service account JSON exists at configured path —
   if not, print the setup instructions and call process.exit(1)

---

## README.md

Cover:
1. What this bot does (one paragraph)
2. Prerequisites
3. Discord Developer Portal setup (step by step: create app, bot token, intents,
   OAuth2 redirect URI http://localhost:3000/auth/callback, required permissions)
4. Firebase + Google Sheets setup (full steps from above)
5. Installation:
   npm install
   cp .env.example .env  — fill in all values
   node deploy-commands.js
   node index.js
6. Important: the forum channel must be a Discord Forum channel (not a text channel)
7. Slash command reference table
8. How to use /dashboard
9. Troubleshooting table

---

## QA CHECKLIST

- [ ] Zero emojis in any file, any output, any message the bot sends
- [ ] Zero DMs sent by the bot under any circumstances
- [ ] Bot refuses to start if Firebase credentials file is missing
- [ ] Bot refuses to start if any .env var is missing
- [ ] Poller catches all errors per-department and never crashes the bot
- [ ] Accept/Deny modals update the Firestore document AND edit the forum thread embed
- [ ] Buttons are disabled after a decision is made
- [ ] Auto-detect Discord ID column works without any manual config
- [ ] Seed runs only if collections are empty (no duplicate docs on restart)
- [ ] All staff commands check permissions
- [ ] Dashboard routes all require authentication
- [ ] No secrets hardcoded anywhere
- [ ] .env and credentials/ are in .gitignore
- [ ] Forum threads split Q&A across multiple messages if over 1900 characters
