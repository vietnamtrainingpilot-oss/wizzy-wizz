let client = null;

module.exports = {
  setClient: (c) => {
    client = c;
  },
  getClient: () => {
    if (!client) {
      throw new Error('Bot client not initialized. Call setClient first.');
    }
    return client;
  }
};
