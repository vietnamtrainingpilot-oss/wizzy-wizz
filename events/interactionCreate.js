const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const { staffOnly } = require('../utils/permissions');
const { updateSubmissionStatus } = require('../modules/applications/statusManager');
const { errorEmbed, successEmbed } = require('../utils/embeds');

module.exports = {
  name: 'interactionCreate',
  async execute(interaction) {
    // Handle Button Interactions
    if (interaction.isButton()) {
      const [action, submissionId] = interaction.customId.split('_');

      if (action === 'accept' || action === 'deny') {
        if (!(await staffOnly(interaction))) return;

        const isAccept = action === 'accept';
        const modal = new ModalBuilder()
          .setCustomId(`modal_${action}_${submissionId}`)
          .setTitle(isAccept ? 'Accept Application' : 'Deny Application');

        const input = new TextInputBuilder()
          .setCustomId('reason')
          .setLabel(isAccept ? 'Notes (optional)' : 'Reason for denial')
          .setStyle(TextInputStyle.Paragraph)
          .setPlaceholder(isAccept ? 'Any notes for the record...' : 'Provide a clear reason...')
          .setRequired(!isAccept);

        modal.addComponents(new ActionRowBuilder().addComponents(input));
        return await interaction.showModal(modal);
      }
    }

    // Handle Modal Interactions
    if (interaction.isModalSubmit()) {
      const [_, action, submissionId] = interaction.customId.split('_');
      const reason = interaction.fields.getTextInputValue('reason');

      if (action === 'accept' || action === 'deny') {
        try {
          const status = action === 'accept' ? 'ACCEPTED' : 'DENIED';
          const reviewerTag = interaction.user.tag;
          const reviewerId = interaction.user.id;

          await updateSubmissionStatus(submissionId, status, {
            reason: action === 'deny' ? reason : null,
            notes: action === 'accept' ? reason : null,
            reviewerId,
            reviewerTag
          });

          await interaction.reply({
            content: `Application ${status.toLowerCase()}ed.`,
            ephemeral: true
          });
        } catch (e) {
          await interaction.reply({
            embeds: [errorEmbed('Error', e.message)],
            ephemeral: true
          });
        }
        return;
      }
    }

    // Handle Slash Commands
    if (interaction.isChatInputCommand()) {
      const command = interaction.client.commands.get(interaction.commandName);
      if (!command) return;

      try {
        await command.execute(interaction);
      } catch (e) {
        console.error(e);
        await interaction.reply({
          embeds: [errorEmbed('Command Error', 'An unexpected error occurred while executing this command.')],
          ephemeral: true
        });
      }
    }
  }
};
