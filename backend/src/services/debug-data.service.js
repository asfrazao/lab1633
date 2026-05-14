const path = require('path');

const { writeJsonArray } = require('../utils/jsonFile.util');
const { nowIso } = require('../utils/date.util');

const dataTargets = {
  leads: {
    file: 'leads.json',
    filePath: path.join(__dirname, '..', 'data', 'leads.json'),
  },
  conversations: {
    file: 'conversations.json',
    filePath: path.join(__dirname, '..', 'data', 'conversations.json'),
  },
  notifications: {
    file: 'notifications.json',
    filePath: path.join(__dirname, '..', 'data', 'notifications.json'),
  },
};

async function resetLeads() {
  return resetTarget('leads');
}

async function resetConversations() {
  return resetTarget('conversations');
}

async function resetNotifications() {
  return resetTarget('notifications');
}

async function resetAllData() {
  const resetAt = nowIso();
  const targets = [];

  for (const target of ['leads', 'conversations', 'notifications']) {
    const result = await resetTarget(target, resetAt);
    targets.push({
      target: result.target,
      file: result.file,
      items: result.items,
    });
  }

  return {
    success: true,
    resetAt,
    targets,
  };
}

async function resetTarget(target, resetAt = nowIso()) {
  const dataTarget = dataTargets[target];

  if (!dataTarget) {
    throw new Error(`Target de reset desconhecido: ${target}`);
  }

  await writeJsonArray(dataTarget.filePath, []);

  return {
    success: true,
    target,
    file: dataTarget.file,
    items: 0,
    resetAt,
  };
}

module.exports = {
  resetAllData,
  resetConversations,
  resetLeads,
  resetNotifications,
};
