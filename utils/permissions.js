const { serverConfig } = require('../firebase/collections');
const { errorEmbed } = require('./embeds');

async function isStaff(member) {
  if (!member) return false;

  const configDoc = await serverConfig.doc('main').get();
  if (!configDoc.exists) return false;

  const staffRoleId = configDoc.data().staffRoleId;
  if (!staffRoleId) return false;

  return member.roles.cache.has(staffRoleId);
}

async function staffOnly(interaction) {
  const member = interaction.member;
  const staff = await isStaff(member);

  if (!staff) {
    await interaction.reply({
      embeds: [errorEmbed('Permission Denied', 'You do not have permission to use this command.')],
      ephemeral: true
    });
    return false;
  }
  return true;
}

module.exports = {
  isStaff,
  staffOnly
};
