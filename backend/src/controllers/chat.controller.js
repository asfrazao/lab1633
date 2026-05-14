const aiOrchestratorService = require('../services/ai-orchestrator.service');
const conversationService = require('../services/conversation.service');
const leadService = require('../services/lead.service');
const notificationService = require('../services/notification.service');
const { allowedActions, allowedStates, interestLevels } = require('../prompts/agente-vendedor.prompt');
const { nichos } = require('../prompts/nichos.prompt');

async function handleChatTeste(req, res, next) {
  try {
    const { from, message } = req.body || {};

    if (!from || !String(from).trim()) {
      return res.status(400).json({
        erro: 'Campo "from" e obrigatorio.',
      });
    }

    if (!message || !String(message).trim()) {
      return res.status(400).json({
        erro: 'Campo "message" e obrigatorio e nao pode estar vazio.',
      });
    }

    const telefone = String(from).trim();
    const mensagem = String(message).trim();

    console.log('[Chat] Inicio /chat-teste', { from: telefone });
    console.log(`[Chat] Mensagem recebida de ${telefone}`);
    console.log(`[AI] Provider configurado: ${aiOrchestratorService.getAIProvider()}`);

    const existingConversation = await conversationService.findByTelefone(telefone);
    let conversation = existingConversation || conversationService.createConversation(telefone);
    console.log('[Chat] Conversa carregada/criada', { conversationId: conversation.id });

    conversation = conversationService.appendMessage(conversation, 'cliente', mensagem);
    const detectedBusiness = identifyBusinessType(mensagem) || conversation.tipoNegocio;
    const conversationForAi = {
      ...conversation,
      tipoNegocio: detectedBusiness || conversation.tipoNegocio || null,
    };

    const { result, source } = await aiOrchestratorService.generateAgentResponse({
      from: telefone,
      message: mensagem,
      conversation: conversationForAi,
      lead: buildLeadContext(conversationForAi),
      nichoInfo: detectedBusiness ? nichos[detectedBusiness] : null,
    });

    const agentResult = normalizeAgentResponse(result, telefone);

    if (!agentResult) {
      throw new Error('AI orchestrator retornou resultado invalido.');
    }
    console.log('[Chat] Resposta gerada', {
      source,
      estado: agentResult.estado,
      acao: agentResult.acao,
    });

    conversation = applyAgentResponseToConversation(conversation, agentResult);
    conversation = conversationService.appendMessage(conversation, 'agente', agentResult.resposta);
    conversation = await conversationService.save(conversation);
    const lead = await leadService.upsertFromConversation(conversation);
    console.log('[Chat] Lead salvo', {
      telefone: lead.telefone,
      nivelInteresse: lead.nivelInteresse,
    });
    const notificationResult = await maybeNotifyHotLead({
      agentResult,
      conversation,
      lead,
    });
    console.log('[Chat] Notificacao processada', notificationResult);
    console.log(`[Chat] Source da resposta: ${source}`);

    const responseBody = {
      resposta: agentResult.resposta,
      estado: conversation.estado,
      lead: {
        telefone: lead.telefone,
        nome: lead.nome,
        tipoNegocio: lead.tipoNegocio,
        nivelInteresse: lead.nivelInteresse,
      },
      conversationId: conversation.id,
      source,
      acao: agentResult.acao,
    };

    if (notificationResult) {
      responseBody.notification = {
        created: notificationResult.created,
        updated: notificationResult.updated,
        id: notificationResult.id,
        status: notificationResult.status,
      };

      if (notificationResult.error) {
        responseBody.notification.error = true;
      }
    }

    console.log('[Chat] Fim /chat-teste', { from: telefone });
    return res.json(responseBody);
  } catch (error) {
    console.error('[ChatController] Erro em /chat-teste:', {
      message: error.message,
      stack: error.stack,
    });

    return res.status(500).json({
      error: 'Erro interno no servidor.',
    });
  }
}

async function maybeNotifyHotLead({ agentResult, conversation, lead }) {
  if (agentResult.acao !== 'notificar_humano' && lead.nivelInteresse !== 'quente') {
    return null;
  }

  try {
    console.log('[Chat] Criando/atualizando notificacao...');
    return await notificationService.createOrUpdateHotLeadNotification({
      lead,
      conversation,
      result: agentResult,
    });
  } catch (notificationError) {
    console.error('[Notification] Falha ao criar/atualizar notificacao:', {
      message: notificationError.message,
      stack: notificationError.stack,
    });

    return {
      created: false,
      updated: false,
      id: null,
      status: null,
      error: true,
    };
  }
}

function buildLeadContext(conversation) {
  return {
    telefone: conversation.telefone,
    nome: conversation.nome,
    tipoNegocio: conversation.tipoNegocio,
    dorPrincipal: conversation.dorPrincipal,
    nivelInteresse: conversation.nivelInteresse,
  };
}

function normalizeAgentResponse(agentResponse, telefone) {
  if (!agentResponse || typeof agentResponse !== 'object' || Array.isArray(agentResponse)) {
    return null;
  }

  if (
    typeof agentResponse.resposta !== 'string' ||
    !agentResponse.resposta.trim() ||
    !allowedStates.includes(agentResponse.estado) ||
    (agentResponse.acao && !allowedActions.includes(agentResponse.acao)) ||
    !agentResponse.lead ||
    typeof agentResponse.lead !== 'object' ||
    Array.isArray(agentResponse.lead) ||
    !interestLevels.includes(agentResponse.lead.nivelInteresse)
  ) {
    return null;
  }

  return {
    resposta: agentResponse.resposta.trim(),
    estado: agentResponse.estado,
    lead: {
      telefone,
      nome: normalizeNullableString(agentResponse.lead.nome),
      tipoNegocio: normalizeNullableString(agentResponse.lead.tipoNegocio),
      dorPrincipal: normalizeNullableString(agentResponse.lead.dorPrincipal),
      nivelInteresse: agentResponse.lead.nivelInteresse,
    },
    acao: agentResponse.acao || 'continuar_conversa',
  };
}

function applyAgentResponseToConversation(conversation, agentResponse) {
  return {
    ...conversation,
    estado: agentResponse.estado,
    nome: agentResponse.lead.nome || conversation.nome || null,
    tipoNegocio: agentResponse.lead.tipoNegocio || conversation.tipoNegocio || null,
    dorPrincipal: agentResponse.lead.dorPrincipal || conversation.dorPrincipal || null,
    nivelInteresse: strongestInterest(conversation.nivelInteresse, agentResponse.lead.nivelInteresse),
  };
}

function normalizeNullableString(value) {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmedValue = value.trim();
  return trimmedValue || null;
}

function strongestInterest(currentInterest, nextInterest) {
  const levels = {
    frio: 1,
    morno: 2,
    quente: 3,
  };

  return levels[nextInterest] > levels[currentInterest] ? nextInterest : currentInterest;
}

function identifyBusinessType(message) {
  const normalizedMessage = normalizeText(message);

  return Object.entries(nichos).find(([, nicho]) => {
    return nicho.palavrasChave.some((keyword) => normalizedMessage.includes(normalizeText(keyword)));
  })?.[0] || null;
}

function normalizeText(value) {
  return String(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

module.exports = {
  handleChatTeste,
};
