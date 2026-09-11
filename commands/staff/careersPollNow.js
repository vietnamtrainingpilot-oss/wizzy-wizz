const { SlashCommandBuilder } = require('discord.js');
const { staffOnly } = require('../../utils/permissions');
const { runAllPolls } = require('../../modules/poller/sheetsPoller');
const { successEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('careers-poll-now')
    .setDescription('Trigger an immediate poll of all career sheets'),

  async execute(interaction) {
    if (!(await staffOnly(interaction))) return;

    await interaction.reply({ content: 'Polling all sheets now...', ephemeral: true });

    try {
      const count = await runAllPolls();
      await interaction.editReply({ content: `Poll complete. Found ${count} new submissions.` });
    } catch (e) {
      await interaction.editReply({ content: `Error during poll: ${e.message}` });
    }
  }
};
