const clientProfileService = require('./client-profile.service');
const conversationService = require('./conversation.service');
const leadService = require('./lead.service');
const notificationService = require('./notification.service');
const { nichos } = require('../prompts/nichos.prompt');

async function getClientProfileTool({ phone } = {}) {
  return wrapTool(async () => clientProfileService.getClientProfileByPhone(phone));
}

async function saveLeadTool({ lead } = {}) {
  return wrapTool(async () => {
    if (!lead?.telefone) {
      throw new Error('Lead sem telefone.');
    }

    return leadService.upsertFromConversation({
      telefone: clientProfileService.normalizePhone(lead.telefone),
      nome: lead.nome || null,
      tipoNegocio: lead.tipoNegocio || null,
      dorPrincipal: lead.dorPrincipal || null,
      nivelInteresse: lead.nivelInteresse || 'frio',
      profileId: lead.profileId || null,
      clientName: lead.clientName || null,
      aiProvider: lead.aiProvider || null,
      historico: [],
    });
  });
}

async function createNotificationTool({ lead, conversation, result } = {}) {
  return wrapTool(async () => notificationService.createOrUpdateHotLeadNotification({ lead, conversation, result }));
}

async function finishConversationTool({ phone } = {}) {
  return wrapTool(async () => {
    const telefone = clientProfileService.normalizePhone(phone);
    const conversation = await conversationService.findByTelefone(telefone);

    if (!conversation) {
      throw new Error('Conversa nao encontrada.');
    }

    return conversationService.save({
      ...conversation,
      estado: 'finalizado',
    });
  });
}

async function restartConversationTool({ phone } = {}) {
  return wrapTool(async () => {
    const telefone = clientProfileService.normalizePhone(phone);
    const existingConversation = await conversationService.findByTelefone(telefone);
    const baseConversation = existingConversation || conversationService.createConversation(telefone);

    return conversationService.save({
      ...baseConversation,
      estado: 'inicio',
      tipoNegocio: null,
      dorPrincipal: null,
      nome: null,
      nivelInteresse: 'frio',
      historico: [],
    });
  });
}

async function getPlansTool() {
  return {
    success: true,
    data: [
      {
        id: 'mvp-demo',
        nome: 'Demonstração MVP',
        descricao: 'Plano demonstrativo para validar atendimento com agente de IA no WhatsApp.',
      },
    ],
  };
}

async function getBusinessPlaybookTool({ tipoNegocio } = {}) {
  return wrapTool(async () => {
    const key = String(tipoNegocio || '').trim();
    return {
      tipoNegocio: key || null,
      playbook: nichos[key] || null,
    };
  });
}

async function wrapTool(fn) {
  try {
    const data = await fn();
    return {
      success: true,
      data,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

module.exports = {
  createNotificationTool,
  finishConversationTool,
  getBusinessPlaybookTool,
  getClientProfileTool,
  getPlansTool,
  restartConversationTool,
  saveLeadTool,
};
