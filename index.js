const { Client, GatewayIntentBits, Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('./config/config');
const { setClient } = require('./utils/botClient');
const { db } = require('./firebase/init');
const { applicationTypes, pollerState, serverConfig } = require('./firebase/collections');
const { startPoller } = require('./modules/poller/sheetsPoller');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.commands = new Collection();

async function seed() {
  console.log('Checking for initial seed...');

  const typesSnapshot = await applicationTypes.get();
  if (typesSnapshot.empty) {
    console.log('Seeding application types...');
    const departments = [
      { name: 'Flight Deck', sheetId: config.sheets.FLIGHT_DECK },
      { name: 'Ground Crew', sheetId: config.sheets.GROUND_CREW },
      { name: 'Cabin Crew', sheetId: config.sheets.CABIN_CREW },
      { name: 'Flight Operator', sheetId: config.sheets.FLIGHT_OPERATOR },
      { name: 'Human Resources', sheetId: config.sheets.HUMAN_RESOURCES },
      { name: 'Public Relations', sheetId: config.sheets.PUBLIC_RELATIONS },
      { name: 'High-rank', sheetId: config.sheets.HIGH_RANK },
    ];

    for (const dept of departments) {
      const docRef = await applicationTypes.add({
        ...dept,
        cooldownDays: 7,
        enabled: true,
        createdAt: new Date()
      });
      await pollerState.doc(docRef.id).set({ lastRowSeen: 1 });
    }
    console.log('Seeding complete.');
  }

  const configDoc = await serverConfig.doc('main').get();
  if (!configDoc.exists) {
    await serverConfig.doc('main').set({
      staffRoleId: '',
      forumChannelId: config.discord.forumChannelId
    });
  }
}

async function loadCommands() {
  const foldersPath = path.join(__dirname, 'commands');
  const commandFolders = fs.readdirSync(foldersPath);

  for (const folder of commandFolders) {
    const commandsPath = path.join(foldersPath, folder);
    if (!fs.lstatSync(commandsPath).isDirectory()) continue;

    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    for (const file of commandFiles) {
      const command = require(path.join(commandsPath, file));
      client.commands.set(command.data.name, command);
    }
  }

  // Also load top-level commands
  const rootCommands = fs.readdirSync(foldersPath).filter(file => file.endsWith('.js')); // Wait, folder only
  // Correction: load commands/configure.js
  const configCmd = require('./commands/configure');
  client.commands.set(configCmd.data.name, configCmd);
}

async function loadEvents() {
  const eventsPath = path.join(__dirname, 'events');
  const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

  for (const file of eventFiles) {
    const event = require(path.join(eventsPath, file));
    if (event.once) {
      client.once(event.name, (...args) => event.execute(...args));
    } else {
      client.on(event.name, (...args) => event.execute(...args));
    }
  }
}

async function bootstrap() {
  try {
    setClient(client);
    await loadCommands();
    await loadEvents();
    await seed();

    await client.login(config.discord.token);

    // After login, start the poller
    startPoller(client);
    console.log('Bot is online and polling started.');

  } catch (e) {
    console.error('Failed to bootstrap bot:', e);
    process.exit(1);
  }
}

bootstrap();
