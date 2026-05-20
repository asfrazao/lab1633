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
    const normalizedLead = normalizeLead(lead);

    if (!normalizedLead.telefone) {
      throw new Error('Lead sem telefone.');
    }

    return leadService.upsertFromConversation({
      ...normalizedLead,
      historico: [],
    });
  });
}

async function createNotificationTool({ lead, conversation, result } = {}) {
  return wrapTool(async () => {
    const shouldNotify =
      lead?.nivelInteresse === 'quente' ||
      result?.lead?.nivelInteresse === 'quente' ||
      result?.acao === 'notificar_humano';

    if (!shouldNotify) {
      return {
        skipped: true,
        reason: 'Lead ainda nao esta quente.',
      };
    }

    return notificationService.createOrUpdateHotLeadNotification({ lead, conversation, result });
  });
}

async function finishConversationTool({ phone, conversationId } = {}) {
  return wrapTool(async () => {
    const telefone = clientProfileService.normalizePhone(phone);
    const conversation = conversationId
      ? await conversationService.findById(conversationId)
      : await conversationService.findByTelefone(telefone);

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
      estado: 'identificar_negocio',
      tipoNegocio: null,
      dorPrincipal: null,
      nome: null,
      nivelInteresse: 'frio',
    });
  });
}

async function getPlansTool() {
  return {
    success: true,
    data: [
      {
        id: 'start',
        nome: 'Start',
        descricao: 'Agente inicial para atendimento e qualificacao.',
      },
      {
        id: 'pro',
        nome: 'Pro',
        descricao: 'Agente com fluxo mais completo, notificacoes e ajustes por nicho.',
      },
    ],
  };
}

async function getBusinessPlaybookTool({ tipoNegocio } = {}) {
  return wrapTool(async () => getBusinessPlaybook(tipoNegocio));
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
      error: error.message || 'Falha controlada ao executar tool.',
    };
  }
}

function normalizeLead(lead = {}) {
  const allowedInterestLevels = ['frio', 'morno', 'quente'];
  const nivelInteresse = allowedInterestLevels.includes(lead.nivelInteresse) ? lead.nivelInteresse : 'frio';

  return {
    telefone: clientProfileService.normalizePhone(lead.telefone),
    nome: normalizeNullableString(lead.nome),
    tipoNegocio: normalizeNullableString(lead.tipoNegocio),
    dorPrincipal: normalizeNullableString(lead.dorPrincipal),
    nivelInteresse,
    profileId: normalizeNullableString(lead.profileId),
    clientName: normalizeNullableString(lead.clientName),
    aiProvider: normalizeNullableString(lead.aiProvider),
  };
}

function normalizeNullableString(value) {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmedValue = value.trim();
  return trimmedValue || null;
}

function getBusinessPlaybook(tipoNegocio) {
  const normalizedBusiness = String(tipoNegocio || 'generico').toLowerCase().trim() || 'generico';
  const playbooks = {
    doceria: {
      tipoNegocio: 'doceria',
      perguntas: ['data do evento', 'sabor', 'tamanho', 'tema', 'retirada ou entrega'],
      objetivo: 'coletar dados para orcamento de bolo ou doces.',
    },
    barbearia: {
      tipoNegocio: 'barbearia',
      perguntas: ['servico desejado', 'dia', 'horario', 'profissional de preferencia'],
      objetivo: 'organizar agendamento e reduzir troca manual de mensagens.',
    },
    letreiros: {
      tipoNegocio: 'letreiros',
      perguntas: ['tipo de letreiro', 'medidas', 'material', 'prazo', 'instalacao', 'referencia visual'],
      objetivo: 'coletar dados minimos para avaliar orcamento e viabilidade.',
    },
    generico: {
      tipoNegocio: 'generico',
      perguntas: ['necessidade do cliente', 'prazo', 'dados de contato', 'proximo passo esperado'],
      objetivo: 'qualificar atendimento e organizar oportunidade.',
    },
  };

  return {
    tipoNegocio: normalizedBusiness,
    playbook: playbooks[normalizedBusiness] || nichos[normalizedBusiness] || playbooks.generico,
  };
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
