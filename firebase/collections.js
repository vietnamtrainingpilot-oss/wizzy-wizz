const { db } = require('./init');

module.exports = {
  applicationTypes: db.collection('applicationTypes'),
  submissions:      db.collection('submissions'),
  pollerState:      db.collection('pollerState'),
  blacklist:        db.collection('blacklist'),
  serverConfig:     db.collection('serverConfig')
};
