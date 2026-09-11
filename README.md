# Wizz Air PTFS Discord Application Bot

A production-ready Discord bot for automating career applications for the Wizz Air PTFS virtual airline.

## Features
- **Automatic Polling**: Polls 7 separate Google Sheets every 5 minutes for new submissions.
- **Forum Review System**: Creates a dedicated Discord forum thread for every application.
- **One-Click Grading**: Staff can Accept or Deny applications via buttons and modals directly in Discord.
- **Public Result Announcements**: Automatically posts decision results in a designated results channel.
- **Application Management**: Search, list, and manually update application statuses via slash commands.
- **Blacklist System**: Prevent specific users from applying across all departments.
- **Firestore Integration**: All data is persisted in Firebase Firestore for reliability.

## Prerequisites
- Node.js v18+
- A Discord Bot account with necessary intents (Guilds, GuildMembers, GuildMessages, MessageContent).
- A Google Cloud Project with Sheets API enabled.
- A Firebase project with Firestore enabled.

## Setup Instructions

### Discord Developer Portal
1. Create a new application at [Discord Developer Portal](https://discord.com/developers/applications).
2. Create a Bot and copy the **Token**.
3. Enable the following **Privileged Gateway Intents**:
   - Server Members Intent
   - Message Content Intent
4. Invite the bot to your server with `Administrator` permissions.

### Firebase Setup
1. Go to [Firebase Console](https://console.firebase.google.com).
2. Create a project called `wizz-air-ptfs-bot`.
3. Go to **Project Settings** > **Service Accounts** > **Generate new private key**.
4. Rename the downloaded JSON to `firebase-service-account.json`.
5. Create a folder `credentials/` in the bot root and move the file there.
6. Initialize **Firestore Database** in production mode.
7. Copy the **Project ID** from settings and paste it into `.env`.

### Google Sheets Setup
1. In the same Google Cloud project linked to Firebase, enable the **Google Sheets API**.
2. Open `credentials/firebase-service-account.json` and copy the `client_email`.
3. Share each of the 7 career Google Sheets with this email as **Viewer**.
4. Copy the Sheet ID from the URL of each sheet and paste it into `.env`.

## Installation
1. Install dependencies:
   ```bash
   npm install
   ```
2. Create `.env` from `.env.example`:
   ```bash
   cp .env.example .env
   ```
3. Fill in all values in `.env`.
4. Deploy slash commands:
   ```bash
   npm run deploy
   ```
5. Start the bot:
   ```bash
   npm start
   ```

## Slash Command Reference

| Command | Description | Permission |
|---|---|---|
| `/application view` | Search and view detailed application data | Staff |
| `/application list` | List applications with filters (dept/status) | Staff |
| `/application setstatus` | Manually override an application status | Staff |
| `/blacklist add` | Add a user to the application blacklist | Staff |
| `/blacklist remove` | Remove a user from the blacklist | Staff |
| `/blacklist view` | View a user's blacklist entry | Staff |
| `/cooldown reset` | Clear the application cooldown for a user | Staff |
| `/careers-poll-now` | Manually trigger a poll of all sheets | Staff |
| `/configure set-staff-role` | Set the role allowed to use staff commands | Admin |
| `/configure set-forum-channel` | Set the forum channel for reviews | Admin |
| `/configure set-results-channel` | Set the channel for public result announcements | Admin |
| `/configure view` | View current bot configuration | Staff |

## Hosting Recommendations

For production stability, avoid "free" hosts that sleep.

- **Best (Paid/Pro)**: A small VPS (DigitalOcean, Hetzner, Linode) with **PM2** for process management.
- **Best (Free)**: **Oracle Cloud Free Tier** (ARM Ampere instance) for 100% uptime and high resources.
- **Easiest (Free)**: **Bot-hosting.net** or similar Pterodactyl hosts (be mindful of "coin" systems).

## Important Notes
- The `FORUM_CHANNEL_ID` must be a **Forum** type channel.
- The bot follows a strict **Zero Emoji** policy.
- No direct messages (DMs) are sent by the bot.
