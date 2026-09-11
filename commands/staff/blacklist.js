const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { staffOnly } = require('../../utils/permissions');
const { blacklist } = require('../../firebase/collections');
const { infoEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('blacklist')
    .setDescription('Manage the application blacklist')
    .addSubcommand(sub =>
      sub.setName('add')
        .setDescription('Blacklist a user')
        .addStringOption(opt => opt.setName('discord_id').setDescription('Discord User ID').setRequired(true))
        .addStringOption(opt => opt.setName('reason').setDescription('Reason for blacklisting').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('remove')
        .setDescription('Remove a user from blacklist')
        .addStringOption(opt => opt.setName('discord_id').setDescription('Discord User ID').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('view')
        .setDescription('View blacklist entry')
        .addStringOption(opt => opt.setName('discord_id').setDescription('Discord User ID').setRequired(true))
    ),

  async execute(interaction) {
    if (!(await staffOnly(interaction))) return;

    const sub = interaction.options.getSubcommand();
    const discordId = interaction.options.getString('discord_id');

    if (sub === 'add') {
      const reason = interaction.options.getString('reason');
      await blacklist.doc(discordId).set({
        discordId,
        reason,
        issuedBy: interaction.user.tag,
        issuedAt: new Date()
      });
      return interaction.reply({ content: `User ${discordId} has been blacklisted.`, ephemeral: true });
    }

    if (sub === 'remove') {
      await blacklist.doc(discordId).delete();
      return interaction.reply({ content: `User ${discordId} removed from blacklist.`, ephemeral: true });
    }

    if (sub === 'view') {
      const doc = await blacklist.doc(discordId).get();
      if (!doc.exists) return interaction.reply({ content: 'User is not blacklisted.', ephemeral: true });

      const data = doc.data();
      const embed = infoEmbed('Blacklist Entry', `Discord ID: ${data.discordId}\nReason: ${data.reason}\nIssued By: ${data.issuedBy}\nIssued At: ${data.issuedAt?.toDate().toLocaleString()}`);
      return interaction.reply({ embeds: [embed] });
    }
  }
};
