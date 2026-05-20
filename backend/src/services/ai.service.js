const OpenAI = require('openai');

const {
  allowedActions,
  allowedStates,
  buildAgenteVendedorPrompt,
  interestLevels,
} = require('../prompts/agente-vendedor.prompt');
const { safeJsonParse } = require('../utils/safeJsonParse.util');

const DEFAULT_MODEL = 'gpt-5.5';
const PLACEHOLDER_API_KEY = 'coloque_sua_chave_aqui';

let warnedMissingApiKey = false;

function isOpenAIConfigured() {
  const apiKey = process.env.OPENAI_API_KEY;
  const normalizedApiKey = typeof apiKey === 'string' ? apiKey.trim() : '';
  const lowerApiKey = normalizedApiKey.toLowerCase();
  const isPlaceholder =
    lowerApiKey === PLACEHOLDER_API_KEY ||
    lowerApiKey.includes('coloque') ||
    lowerApiKey.includes('sua_chave');

  return Boolean(normalizedApiKey && !isPlaceholder);
}

function getOpenAIModel() {
  return process.env.OPENAI_MODEL || DEFAULT_MODEL;
}

function getOpenAIClient() {
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY.trim(),
  });
}

async function generateAgentResponse({ from, message, conversation, lead, nichoInfo, clientProfile }) {
  try {
    if (!isOpenAIConfigured()) {
      if (!warnedMissingApiKey) {
        console.warn('[OpenAI] OPENAI_API_KEY ausente. Usando fallback.');
        warnedMissingApiKey = true;
      }
      return null;
    }

    const client = getOpenAIClient();
    const model = getOpenAIModel();

    console.log('[OpenAI] Chamando Responses API com modelo:', model);

    const response = await client.responses.create({
      model,
      instructions: buildAgenteVendedorPrompt({ clientProfile }),
      input: JSON.stringify(buildModelContext({ from, message, conversation, lead, nichoInfo, clientProfile })),
    });

    const outputText = response.output_text;

    if (!outputText) {
      console.error('[OpenAI] response.output_text vazio. Resposta bruta:', JSON.stringify(response, null, 2));
      return null;
    }

    const parsedOutput = safeJsonParse(outputText);

    if (!parsedOutput) {
      console.error('[OpenAI] Nao foi possivel converter resposta em JSON. outputText:', outputText);
      return null;
    }

    if (!isValidAgentPayload(parsedOutput)) {
      console.error('[OpenAI] Payload JSON invalido:', parsedOutput);
      return null;
    }

    return parsedOutput;
  } catch (error) {
    console.error('[OpenAI] Falha ao gerar resposta:', {
      message: error.message,
      status: error.status,
      code: error.code,
      type: error.type,
    });
    return null;
  }
}

async function pingOpenAI() {
  const model = getOpenAIModel();

  if (!isOpenAIConfigured()) {
    return {
      ok: false,
      model,
      error: {
        message: 'OPENAI_API_KEY ausente.',
      },
    };
  }

  try {
    const response = await getOpenAIClient().responses.create({
      model,
      input: 'Responda apenas: ok',
    });

    return {
      ok: true,
      model,
      output: response.output_text || '',
    };
  } catch (error) {
    return {
      ok: false,
      model,
      error: {
        message: error.message,
        status: error.status,
        code: error.code,
        type: error.type,
      },
    };
  }
}

function buildModelContext({ from, message, conversation, lead, nichoInfo, clientProfile }) {
  return {
    mensagemAtual: message,
    telefone: from,
    estadoAtual: conversation.estado,
    tipoNegocio: conversation.tipoNegocio,
    dorPrincipal: conversation.dorPrincipal,
    nome: conversation.nome,
    nivelInteresse: conversation.nivelInteresse,
    ultimasMensagens: (conversation.historico || []).slice(-10),
    lead: lead || null,
    nichoInfo: nichoInfo || null,
    clientProfile: clientProfile
      ? {
          id: clientProfile.id,
          nomeCliente: clientProfile.nomeCliente,
          tipoNegocio: clientProfile.tipoNegocio,
          descricao: clientProfile.descricao,
          promptPerfil: clientProfile.promptPerfil,
        }
      : null,
  };
}

function isValidAgentPayload(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return false;
  }

  if (typeof payload.resposta !== 'string' || !payload.resposta.trim()) {
    return false;
  }

  if (typeof payload.estado !== 'string' || !allowedStates.includes(payload.estado)) {
    return false;
  }

  if (!payload.lead || typeof payload.lead !== 'object' || Array.isArray(payload.lead)) {
    return false;
  }

  if (!interestLevels.includes(payload.lead.nivelInteresse)) {
    return false;
  }

  if (payload.acao && !allowedActions.includes(payload.acao)) {
    return false;
  }

  return true;
}

module.exports = {
  generateAgentResponse,
  getOpenAIModel,
  isOpenAIConfigured,
  isValidAgentPayload,
  pingOpenAI,
};
