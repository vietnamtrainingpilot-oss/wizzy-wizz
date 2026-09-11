const { REST, Routes } = require('discord.js');
const config = require('./config/config');
const fs = require('fs');
const path = require('path');

const commands = [];

async function loadCommands() {
  const foldersPath = path.join(__dirname, 'commands');
  const folders = fs.readdirSync(foldersPath);

  for (const folder of folders) {
    const folderPath = path.join(foldersPath, folder);
    if (!fs.lstatSync(folderPath).isDirectory()) continue;

    const files = fs.readdirSync(folderPath).filter(f => f.endsWith('.js'));
    for (const file of files) {
      const cmd = require(path.join(folderPath, file));
      commands.push(cmd.data.toJSON());
    }
  }

  // Load top-level commands like configure.js
  const rootFiles = fs.readdirSync(foldersPath).filter(f => f.endsWith('.js'));
  for (const file of rootFiles) {
    const cmd = require(path.join(foldersPath, file));
    commands.push(cmd.data.toJSON());
  }
}

async function deploy() {
  await loadCommands();

  const rest = new REST({ version: '10' }).setToken(config.discord.token);

  try {
    console.log(`Started refreshing ${commands.length} application (/) commands.`);

    await rest.put(
      Routes.applicationGuildCommands(config.discord.clientId, config.discord.guildId),
      { body: commands },
    );

    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error(error);
  }
}

deploy();
