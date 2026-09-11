const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { applicationSummaryEmbed, statusEmbed } = require('./embeds');
const { submissions } = require('../firebase/collections');
const { getClient } = require('./botClient');

async function createApplicationThread(submission, appType, rawFormData) {
  const client = getClient();
  const config = require('../config/config');
  const forumChannel = await client.channels.fetch(config.discord.forumChannelId);

  if (!forumChannel || forumChannel.type !== 15) { // 15 = GuildForum
    throw new Error('Forum channel not found or is not a Forum channel.');
  }

  const threadName = `[${appType.name}] — ${submission.robloxUsername || submission.discordTag || 'Unknown Applicant'}`;

  // Buttons for Accept/Deny
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`accept_${submission.id}`)
      .setLabel('Accept')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`deny_${submission.id}`)
      .setLabel('Deny')
      .setStyle(ButtonStyle.Danger)
  );

  // Create thread and send first message
  const thread = await forumChannel.threads.create({
    name: threadName,
    autoArchiveDuration: 60,
    message: {
      content: 'New application submission received.',
      embeds: [applicationSummaryEmbed(submission)],
      components: [row]
    }
  });

  // Post Q&A content
  if (!rawFormData || Object.keys(rawFormData).length === 0) {
    await thread.send('No form data available.');
  } else {
    let currentMessage = '';
    const entries = Object.entries(rawFormData);

    for (const [question, answer] of entries) {
      const pair = `${question}\n${answer}\n\n`;
      if ((currentMessage + pair).length > 1900) {
        await thread.send(currentMessage);
        currentMessage = pair;
      } else {
        currentMessage += pair;
      }
    }
    if (currentMessage) {
      await thread.send(currentMessage);
    }
  }

  return thread.id;
}

async function editThreadStatus(submissionId, newStatus, notes, reviewerTag) {
  const client = getClient();
  const submissionDoc = await submissions.doc(submissionId).get();
  if (!submissionDoc.exists) throw new Error('Submission not found.');

  const submission = submissionDoc.data();
  const thread = await client.channels.fetch(submission.forumThreadId);

  if (!thread) throw new Error('Forum thread not found.');

  // Edit the first message
  const firstMessage = await thread.messages.fetch({ limit: 100 })
    .then(msgs => msgs.filter(m => m.author.id === client.user.id).first());

  if (firstMessage) {
    const updatedEmbed = statusEmbed(submission, newStatus);

    // Disable buttons
    const row = ActionRowBuilder.from(firstMessage.components[0]);
    row.components.forEach(btn => btn.setDisabled(true));

    await firstMessage.edit({
      embeds: [updatedEmbed],
      components: [row]
    });
  }

  // Post decision follow-up
  const decisionText = newStatus === 'ACCEPTED'
    ? `Decision: Accepted\nReviewed by: ${reviewerTag}\nNotes: ${notes || 'None'}`
    : `Decision: Denied\nReviewed by: ${reviewerTag}\nReason: ${notes}`;

  await thread.send(decisionText);
}

module.exports = {
  createApplicationThread,
  editThreadStatus
};
