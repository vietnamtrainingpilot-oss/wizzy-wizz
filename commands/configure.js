const { SlashCommandBuilder } = require('discord.js');
const { infoEmbed, errorEmbed } = require('../utils/embeds');
const { serverConfig } = require('../firebase/collections');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('configure')
    .setDescription('Update bot configuration')
    .addSubcommand(sub =>
      sub.setName('set-staff-role')
        .setDescription('Set the staff role ID')
        .addStringOption(opt => opt.setName('role').setDescription('Role ID').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('set-forum-channel')
        .setDescription('Set the forum channel ID')
        .addStringOption(opt => opt.setName('channel').setDescription('Channel ID').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('set-results-channel')
        .setDescription('Set the results announcement channel ID')
        .addStringOption(opt => opt.setName('channel').setDescription('Channel ID').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('view')
        .setDescription('View current configuration')
    ),

  async execute(interaction) {
    // Admin only check (Administrator permission)
    if (!interaction.member.permissions.has('Administrator')) {
      return interaction.reply({ content: 'Only administrators can use this command.', ephemeral: true });
    }

    const sub = interaction.options.getSubcommand();

    if (sub === 'set-staff-role') {
      const roleId = interaction.options.getString('role');
      await serverConfig.doc('main').set({ staffRoleId: roleId }, { merge: true });
      return interaction.reply({ content: `Staff role updated to ${roleId}.`, ephemeral: true });
    }

    if (sub === 'set-forum-channel') {
      const channelId = interaction.options.getString('channel');
      await serverConfig.doc('main').set({ forumChannelId: channelId }, { merge: true });
      return interaction.reply({ content: `Forum channel updated to ${channelId}.`, ephemeral: true });
    }

    if (sub === 'set-results-channel') {
      const channelId = interaction.options.getString('channel');
      await serverConfig.doc('main').set({ resultsChannelId: channelId }, { merge: true });
      return interaction.reply({ content: `Results channel updated to ${channelId}.`, ephemeral: true });
    }

    if (sub === 'view') {
      const doc = await serverConfig.doc('main').get();
      if (!doc.exists) return interaction.reply({ content: 'No configuration found.', ephemeral: true });

      const data = doc.data();
      const embed = infoEmbed('Bot Configuration', `Staff Role ID: ${data.staffRoleId || 'Not set'}\nForum Channel ID: ${data.forumChannelId || 'Not set'}`);
      return interaction.reply({ embeds: [embed] });
    }
  }
};
