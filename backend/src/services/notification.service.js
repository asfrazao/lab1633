const { randomUUID } = require('crypto');
const path = require('path');

const { readJsonArray, writeJsonArray } = require('../utils/jsonFile.util');
const { nowIso } = require('../utils/date.util');

const notificationsFilePath = path.join(__dirname, '..', 'data', 'notifications.json');

async function createOrUpdateHotLeadNotification({ lead, conversation, result } = {}) {
  const telefone = lead?.telefone || conversation?.telefone || result?.lead?.telefone;

  if (!telefone) {
    throw new Error('Telefone ausente para criar notificacao.');
  }

  const notifications = await readJsonArray(notificationsFilePath);
  const timestamp = nowIso();
  const index = notifications.findIndex((notification) => {
    return notification.telefone === telefone && notification.status !== 'resolvida';
  });
  const existingNotification = index >= 0 ? notifications[index] : null;
  const nome = lead?.nome || result?.lead?.nome || null;
  const tipoNegocio = lead?.tipoNegocio || result?.lead?.tipoNegocio || 'negocio nao informado';
  const nivelInteresse = lead?.nivelInteresse || result?.lead?.nivelInteresse || 'quente';
  const notification = {
    id: existingNotification?.id || randomUUID(),
    telefone,
    leadId: lead?.id || existingNotification?.leadId || null,
    conversationId: conversation?.id || existingNotification?.conversationId || null,
    nome,
    tipoNegocio,
    nivelInteresse,
    titulo: buildTitle({ nome, telefone, tipoNegocio }),
    mensagem: buildMessage({ lead, result, nome, tipoNegocio }),
    status: existingNotification?.status || 'nova',
    read: existingNotification?.read || false,
    createdAt: existingNotification?.createdAt || timestamp,
    updatedAt: timestamp,
  };

  if (index >= 0) {
    notifications[index] = notification;
  } else {
    notifications.push(notification);
  }

  await writeJsonArray(notificationsFilePath, notifications);

  return {
    created: index < 0,
    updated: index >= 0,
    id: notification.id,
    status: notification.status,
    item: notification,
  };
}

async function listNotifications() {
  const notifications = await readJsonArray(notificationsFilePath);
  return sortByUpdatedAtDesc(notifications);
}

async function listUnreadNotifications() {
  const notifications = await readJsonArray(notificationsFilePath);
  return sortByUpdatedAtDesc(
    notifications.filter((notification) => !notification.read && notification.status !== 'resolvida')
  );
}

async function markAsRead(id) {
  return updateNotification(id, (notification) => ({
    ...notification,
    read: true,
    status: notification.status === 'nova' ? 'lida' : notification.status,
    updatedAt: nowIso(),
  }));
}

async function markAsResolved(id) {
  return updateNotification(id, (notification) => ({
    ...notification,
    read: true,
    status: 'resolvida',
    updatedAt: nowIso(),
  }));
}

async function updateNotification(id, updater) {
  const notifications = await readJsonArray(notificationsFilePath);
  const index = notifications.findIndex((notification) => notification.id === id);

  if (index < 0) {
    return null;
  }

  const updatedNotification = updater(notifications[index]);
  notifications[index] = updatedNotification;
  await writeJsonArray(notificationsFilePath, notifications);

  return updatedNotification;
}

function buildTitle({ nome, telefone, tipoNegocio }) {
  const leadName = nome || telefone;

  return `Lead quente: ${leadName} - ${tipoNegocio}`;
}

function buildMessage({ lead, result, nome, tipoNegocio }) {
  if (lead?.resumo) {
    return lead.resumo;
  }

  const dorPrincipal = lead?.dorPrincipal || result?.lead?.dorPrincipal || null;
  const parts = [];

  parts.push(`Cliente${nome ? ` ${nome}` : ''}`);

  if (tipoNegocio && tipoNegocio !== 'negocio nao informado') {
    parts.push(`informou ter ${formatBusiness(tipoNegocio)}`);
  }

  if (dorPrincipal) {
    parts.push(`relatou dificuldade ${formatPain(dorPrincipal)}`);
  }

  parts.push('demonstrou interesse em contratar ou testar um agente de IA');

  return `${parts.join(', ')}.`;
}

function formatBusiness(tipoNegocio) {
  const labels = {
    doceria: 'uma doceria',
    marmitaria: 'uma marmitaria',
    barbearia: 'uma barbearia',
    assistencia_tecnica: 'uma assistencia tecnica',
    igreja_eventos: 'uma igreja ou operacao de eventos',
  };

  return labels[tipoNegocio] || `um negocio do tipo ${tipoNegocio}`;
}

function formatPain(dorPrincipal) {
  const normalizedPain = String(dorPrincipal).toLowerCase();

  if (normalizedPain.includes('orcamento') || normalizedPain.includes('pedido')) {
    return 'em responder orcamentos ou pedidos pelo WhatsApp';
  }

  if (normalizedPain.includes('agendamento')) {
    return 'em organizar agendamentos pelo WhatsApp';
  }

  return `com ${dorPrincipal}`;
}

function sortByUpdatedAtDesc(items) {
  return [...items].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

module.exports = {
  createOrUpdateHotLeadNotification,
  listNotifications,
  listUnreadNotifications,
  markAsRead,
  markAsResolved,
};
