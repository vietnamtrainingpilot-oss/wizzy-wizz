const { EmbedBuilder } = require('discord.js');

const BRAND_COLOR = 0x6F2DA8;
const FOOTER_TEXT = 'Wizz Air PTFS';

module.exports = {
  successEmbed: (title, description) => {
    return new EmbedBuilder()
      .setTitle(title)
      .setDescription(description)
      .setColor(0x2ecc71)
      .setFooter({ text: FOOTER_TEXT });
  },

  errorEmbed: (title, description) => {
    return new EmbedBuilder()
      .setTitle(title)
      .setDescription(description)
      .setColor(0xe74c3c)
      .setFooter({ text: FOOTER_TEXT });
  },

  infoEmbed: (title, description) => {
    return new EmbedBuilder()
      .setTitle(title)
      .setDescription(description)
      .setColor(BRAND_COLOR)
      .setFooter({ text: FOOTER_TEXT });
  },

  applicationSummaryEmbed: (submission) => {
    return new EmbedBuilder()
      .setTitle('Application Details')
      .setColor(BRAND_COLOR)
      .addFields(
        { name: 'Department', value: submission.appTypeName || 'Unknown', inline: false },
        { name: 'Applicant', value: submission.discordTag || 'Not detected', inline: true },
        { name: 'Discord ID', value: submission.discordId || 'Not available', inline: true },
        { name: 'Roblox', value: submission.robloxUsername || 'Not provided', inline: false },
        { name: 'Submitted', value: submission.submittedAt ? `<t:${Math.floor(submission.submittedAt.toDate() / 1000)}:F>` : 'Unknown', inline: false },
        { name: 'Status', value: 'Grading', inline: false }
      )
      .setFooter({ text: FOOTER_TEXT });
  },

  statusEmbed: (submission, status) => {
    const colors = {
      'GRADING': BRAND_COLOR,
      'ACCEPTED': 0x2ecc71,
      'DENIED': 0xe74c3c,
      'BLACKLISTED': 0x333355
    };

    return new EmbedBuilder()
      .setTitle('Application Details')
      .setColor(colors[status] || BRAND_COLOR)
      .addFields(
        { name: 'Department', value: submission.appTypeName || 'Unknown', inline: false },
        { name: 'Applicant', value: submission.discordTag || 'Not detected', inline: true },
        { name: 'Discord ID', value: submission.discordId || 'Not available', inline: true },
        { name: 'Roblox', value: submission.robloxUsername || 'Not provided', inline: false },
        { name: 'Submitted', value: submission.submittedAt ? `<t:${Math.floor(submission.submittedAt.toDate() / 1000)}:F>` : 'Unknown', inline: false },
        { name: 'Status', value: status, inline: false }
      )
      .setFooter({ text: FOOTER_TEXT });
  }
};
