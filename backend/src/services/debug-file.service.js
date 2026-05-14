const path = require('path');

const { readJsonArray } = require('../utils/jsonFile.util');

const dataFiles = {
  leads: path.join(__dirname, '..', 'data', 'leads.json'),
  conversations: path.join(__dirname, '..', 'data', 'conversations.json'),
  notifications: path.join(__dirname, '..', 'data', 'notifications.json'),
};

async function inspectDataFiles() {
  const leads = await inspectFile(dataFiles.leads);
  const conversations = await inspectFile(dataFiles.conversations);
  const notifications = await inspectFile(dataFiles.notifications);

  return {
    leadsFileOk: leads.ok,
    conversationsFileOk: conversations.ok,
    notificationsFileOk: notifications.ok,
    leadsCount: leads.count,
    conversationsCount: conversations.count,
    notificationsCount: notifications.count,
    errors: {
      leads: leads.error,
      conversations: conversations.error,
      notifications: notifications.error,
    },
  };
}

async function inspectFile(filePath) {
  try {
    const items = await readJsonArray(filePath);
    return {
      ok: true,
      count: items.length,
      error: null,
    };
  } catch (error) {
    return {
      ok: false,
      count: 0,
      error: error.message,
    };
  }
}

module.exports = {
  inspectDataFiles,
};
