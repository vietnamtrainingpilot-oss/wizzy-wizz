const { EmbedBuilder } = require('discord.js');
const { getClient } = require('./botClient');
const { serverConfig } = require('../firebase/collections');
const { infoEmbed } = require('./embeds');

async function notifyResult(submission, status, reviewerTag, notes) {
  const client = getClient();
  const configDoc = await serverConfig.doc('main').get();
  const resultsChannelId = configDoc.exists ? configDoc.data().resultsChannelId : null;

  if (!resultsChannelId) {
    console.warn(`[Notifications] Results channel not configured. Skipping public announcement for ${submission.discordTag}.`);
    return;
  }

  try {
    const channel = await client.channels.fetch(resultsChannelId);
    if (!channel) return;

    const isAccepted = status === 'ACCEPTED';
    const color = isAccepted ? 0x2ecc71 : 0xe74c3c;
    const title = isAccepted ? 'Career Application Accepted' : 'Career Application Denied';

    const embed = new EmbedBuilder()
      .setTitle(title)
      .setColor(color)
      .addFields(
        { name: 'Applicant', value: submission.discordTag || 'Unknown', inline: true },
        { name: 'Department', value: submission.appTypeName || 'Unknown', inline: true },
        { name: 'Decision', value: status, inline: false }
      )
      .setFooter({ text: 'Wizz Air PTFS' });

    await channel.send({
      content: isAccepted ? `Congratulations ${submission.discordTag || 'Applicant'}!` : `Application update for ${submission.discordTag || 'Applicant'}.`,
      embeds: [embed]
    });

  } catch (e) {
    console.error(`[Notifications] Error sending result to channel: ${e.message}`);
  }
}

module.exports = {
  notifyResult
};
