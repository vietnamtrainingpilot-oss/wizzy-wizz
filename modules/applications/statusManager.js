const { submissions } = require('../../firebase/collections');
const { editThreadStatus } = require('../../utils/threadManager');
const { notifyResult } = require('../../utils/notifications');
const { admin } = require('../../firebase/init');

async function updateSubmissionStatus(submissionId, status, { reason, notes, reviewerId, reviewerTag } = {}) {
  const submissionRef = submissions.doc(submissionId);
  const submissionDoc = await submissionRef.get();

  if (!submissionDoc.exists) {
    throw new Error('Submission not found.');
  }

  const submission = submissionDoc.data();
  const updateData = {
    status,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  };

  if (reason) updateData.denialReason = reason;
  if (notes) updateData.acceptanceNotes = notes;
  if (reviewerId) updateData.reviewedById = reviewerId;
  if (reviewerTag) updateData.reviewedByTag = reviewerTag;
  if (status !== 'GRADING') {
    updateData.reviewedAt = admin.firestore.FieldValue.serverTimestamp();
  }

  await submissionRef.update(updateData);

  // Edit the forum thread if it exists
  if (submission.forumThreadId) {
    await editThreadStatus(submissionId, status, reason || notes, reviewerTag);
  }

  // Trigger Result Notification (Channel announcement)
  if (status === 'ACCEPTED' || status === 'DENIED') {
    await notifyResult({ ...submission, id: submissionId }, status, reviewerTag, reason || notes);
  }

  return { success: true };
}

module.exports = {
  updateSubmissionStatus
};
