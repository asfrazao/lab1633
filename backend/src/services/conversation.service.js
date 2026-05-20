const { randomUUID } = require('crypto');
const path = require('path');

const { readJsonArray, writeJsonArray } = require('../utils/jsonFile.util');
const { nowIso } = require('../utils/date.util');
const { normalizePhone } = require('./client-profile.service');

const conversationsFilePath = path.join(__dirname, '..', 'data', 'conversations.json');
const MAX_HISTORY_MESSAGES = 30;

async function findByTelefone(telefone) {
  const conversations = await readJsonArray(conversationsFilePath);
  const normalizedTelefone = normalizePhone(telefone);
  return conversations.find((conversation) => {
    return conversation.telefone === telefone || normalizePhone(conversation.telefone) === normalizedTelefone;
  }) || null;
}

async function findById(id) {
  const conversations = await readJsonArray(conversationsFilePath);
  return conversations.find((conversation) => conversation.id === id) || null;
}

function createConversation(telefone) {
  const timestamp = nowIso();

  return {
    id: randomUUID(),
    telefone,
    estado: 'inicio',
    tipoNegocio: null,
    dorPrincipal: null,
    nome: null,
    nivelInteresse: 'frio',
    historico: [],
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function appendMessage(conversation, origem, mensagem) {
  const historico = [
    ...conversation.historico,
    {
      origem,
      mensagem,
      createdAt: nowIso(),
    },
  ];

  return {
    ...conversation,
    historico: historico.slice(-MAX_HISTORY_MESSAGES),
    updatedAt: nowIso(),
  };
}

async function save(conversation) {
  const conversations = await readJsonArray(conversationsFilePath);
  const index = conversations.findIndex((item) => item.id === conversation.id);
  const conversationToSave = {
    ...conversation,
    updatedAt: nowIso(),
  };

  if (index >= 0) {
    conversations[index] = conversationToSave;
  } else {
    conversations.push(conversationToSave);
  }

  await writeJsonArray(conversationsFilePath, conversations);

  return conversationToSave;
}

module.exports = {
  appendMessage,
  createConversation,
  findById,
  findByTelefone,
  save,
};
