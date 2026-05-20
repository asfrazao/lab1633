const agentService = require('./agent.service');
const openAIService = require('./ai.service');
const openAIAgenticService = require('./openai-agentic.service');
const mockAIService = require('./mock-ai.service');

const VALID_PROVIDERS = ['mock', 'openai', 'auto'];

async function generateAgentResponse(params) {
  const provider = getAIProvider(params?.clientProfile);

  if (provider === 'mock') {
    return generateWithMock(params);
  }

  if (provider === 'openai') {
    return generateWithOpenAIOrFallback(params);
  }

  return generateWithAuto(params);
}

function getAIProvider(clientProfile) {
  const provider = String(clientProfile?.aiProvider || process.env.AI_PROVIDER || 'mock').toLowerCase().trim();
  return VALID_PROVIDERS.includes(provider) ? provider : 'mock';
}

async function generateWithMock(params) {
  try {
    const result = await mockAIService.generateMockAgentResponse(params);

    if (openAIService.isValidAgentPayload(result)) {
      return {
        result,
        source: 'mock',
      };
    }

    console.error('[AI Orchestrator] Provider mock retornou payload invalido.');
  } catch (error) {
    console.error('[AI Orchestrator] Falha no provider mock:', error.message);
  }

  return generateWithFallback(params);
}

async function generateWithOpenAIOrFallback(params) {
  const agenticResult = await openAIAgenticService.generateAgenticOpenAIResponse(params);

  if (agenticResult) {
    return {
      result: agenticResult,
      source: 'openai_agentic',
    };
  }

  const result = await openAIService.generateAgentResponse(params);

  if (result) {
    return {
      result,
      source: 'fallback',
    };
  }

  return generateWithFallback(params);
}

async function generateWithAuto(params) {
  if (openAIService.isOpenAIConfigured()) {
    const agenticResult = await openAIAgenticService.generateAgenticOpenAIResponse(params);

    if (agenticResult) {
      return {
        result: agenticResult,
        source: 'openai_agentic',
      };
    }
  }

  return generateWithMock(params);
}

function generateWithFallback(params) {
  const fallbackResult = agentService.generateFallbackResponse({
    conversation: params.conversation,
    message: params.message,
  });

  return {
    result: normalizeFallbackResult({
      fallbackResult,
      from: params.from,
    }),
    source: 'fallback',
  };
}

function normalizeFallbackResult({ fallbackResult, from }) {
  const conversation = fallbackResult.conversation;

  return {
    resposta: fallbackResult.resposta,
    estado: conversation.estado,
    lead: {
      telefone: from,
      nome: conversation.nome || null,
      tipoNegocio: conversation.tipoNegocio || null,
      dorPrincipal: conversation.dorPrincipal || null,
      nivelInteresse: conversation.nivelInteresse || 'frio',
    },
    acao: fallbackResult.acao || 'continuar_conversa',
  };
}

module.exports = {
  generateAgentResponse,
  getAIProvider,
};
