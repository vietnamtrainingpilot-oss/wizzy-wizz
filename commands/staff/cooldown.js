const { SlashCommandBuilder } = require('discord.js');
const { staffOnly } = require('../../utils/permissions');
const { submissions } = require('../../firebase/collections');
const { admin } = require('../../firebase/init');
const { successEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('cooldown')
    .setDescription('Manage application cooldowns')
    .addSubcommand(sub =>
      sub.setName('reset')
        .setDescription('Reset cooldown for a user')
        .addStringOption(opt => opt.setName('discord_id').setDescription('Discord User ID').setRequired(true))
        .addStringOption(opt => opt.setName('department').setDescription('Department').setRequired(true))
    ),

  async execute(interaction) {
    if (!(await staffOnly(interaction))) return;

    const discordId = interaction.options.getString('discord_id');
    const dept = interaction.options.getString('department');

    const snapshot = await submissions
      .where('discordId', '==', discordId)
      .where('appTypeName', '==', dept)
      .where('status', '==', 'DENIED')
      .orderBy('reviewedAt', 'desc')
      .limit(1)
      .get();

    if (snapshot.empty) {
      return interaction.reply({ content: 'No denied applications found for this user in this department.', ephemeral: true });
    }

    const doc = snapshot.docs[0];
    await doc.ref.update({
      reviewedAt: new Date(0) // Reset to epoch
    });

    return interaction.reply({ content: `Cooldown reset for ${discordId} in ${dept}.`, ephemeral: true });
  }
};
