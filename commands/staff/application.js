const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { staffOnly } = require('../../utils/permissions');
const { submissions } = require('../../firebase/collections');
const { updateSubmissionStatus } = require('../../modules/applications/statusManager');
const { errorEmbed, infoEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('application')
    .setDescription('Manage applications')
    .addSubcommand(sub =>
      sub.setName('view')
        .setDescription('View a specific application')
        .addStringOption(opt => opt.setName('search').setDescription('Discord ID, tag, or Roblox username').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('list')
        .setDescription('List applications')
        .addStringOption(opt => opt.setName('department').setDescription('Filter by department'))
        .addStringOption(opt => opt.setName('status').setDescription('Filter by status'))
    )
    .addSubcommand(sub =>
      sub.setName('setstatus')
        .setDescription('Manually set application status')
        .addStringOption(opt => opt.setName('id').setDescription('Firestore document ID').setRequired(true))
        .addStringOption(opt => opt.setName('status').setDescription('New status').setRequired(true)
          .addChoices(
            { name: 'Grading', value: 'GRADING' },
            { name: 'Accepted', value: 'ACCEPTED' },
            { name: 'Denied', value: 'DENIED' },
            { name: 'Blacklisted', value: 'BLACKLISTED' }
          ))
        .addStringOption(opt => opt.setName('reason').setDescription('Reason (required for Denied/Blacklisted)'))
    ),

  async execute(interaction) {
    if (!(await staffOnly(interaction))) return;

    const sub = interaction.options.getSubcommand();

    if (sub === 'view') {
      const search = interaction.options.getString('search').toLowerCase();
      const snapshot = await submissions.get();

      const matches = snapshot.docs.filter(doc => {
        const data = doc.data();
        return (
          (data.discordId && data.discordId.toLowerCase() === search) ||
          (data.discordTag && data.discordTag.toLowerCase().includes(search)) ||
          (data.robloxUsername && data.robloxUsername.toLowerCase().includes(search))
        );
      });

      if (matches.length === 0) {
        return interaction.reply({ content: 'No applications found matching that search.', ephemeral: true });
      }

      if (matches.length > 5) {
        return interaction.reply({ content: 'Too many matches. Please refine your search.', ephemeral: true });
      }

      if (matches.length === 1) {
        const doc = matches[0];
        const data = doc.data();
        const embed = infoEmbed('Application Detail', `ID: ${doc.id}\n\n`);

        Object.entries(data.rawFormData || {}).forEach(([q, a]) => {
          embed.addFields({ name: q, value: a || 'N/A' });
        });

        const row = new ActionRowBuilder();
        if (data.forumThreadId) {
          row.addComponents(new ButtonBuilder()
            .setLabel('Jump to Thread')
            .setStyle(ButtonStyle.Link)
            .setURL(`https://discord.com/channels/${interaction.guildId}/${data.forumThreadId}`));
        }

        return interaction.reply({ embeds: [embed], components: row.components.length ? [row] : [] });
      }

      const listEmbed = infoEmbed('Multiple Applications Found', '');
      matches.forEach(doc => {
        const data = doc.data();
        listEmbed.addFields({
          name: `${data.discordTag || 'Unknown'} (${data.appTypeName})`,
          value: `Status: ${data.status} | ID: ${doc.id}`
        });
      });

      return interaction.reply({ embeds: [listEmbed] });
    }

    if (sub === 'list') {
      const dept = interaction.options.getString('department');
      const status = interaction.options.getString('status');

      let query = submissions.orderBy('submittedAt', 'desc');
      if (dept) query = query.where('appTypeName', '==', dept);
      if (status) query = query.where('status', '==', status);

      const snapshot = await query.limit(10).get();
      if (snapshot.empty) return interaction.reply({ content: 'No applications found.', ephemeral: true });

      const embed = infoEmbed('Applications List', '');
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        embed.addFields({
          name: `${data.discordTag || 'Unknown'}`,
          value: `Dept: ${data.appTypeName} | Status: ${data.status} | Date: ${data.submittedAt?.toDate().toLocaleDateString()}`
        });
      });

      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'setstatus') {
      const id = interaction.options.getString('id');
      const status = interaction.options.getString('status');
      const reason = interaction.options.getString('reason');

      if ((status === 'DENIED' || status === 'BLACKLISTED') && !reason) {
        return interaction.reply({ content: 'A reason is required for Denied or Blacklisted status.', ephemeral: true });
      }

      try {
        await updateSubmissionStatus(id, status, {
          reason,
          reviewerId: interaction.user.id,
          reviewerTag: interaction.user.tag
        });
        return interaction.reply({ content: `Application ${id} status updated to ${status}.`, ephemeral: true });
      } catch (e) {
        return interaction.reply({ embeds: [errorEmbed('Error', e.message)], ephemeral: true });
      }
    }
  }
};
