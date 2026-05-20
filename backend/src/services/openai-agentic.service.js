const OpenAI = require('openai');

const aiService = require('./ai.service');
const { executeToolCall } = require('./openai-tool-executor.service');
const { openAITools } = require('./openai-tools.schema');
const { buildAgenteAgenticPrompt } = require('../prompts/agente-agentic.prompt');
const { safeJsonParse } = require('../utils/safeJsonParse.util');

const MAX_TOOL_ITERATIONS = 3;

async function generateAgenticOpenAIResponse({ from, message, conversation, lead, clientProfile, nichoInfo } = {}) {
  try {
    if (!aiService.isOpenAIConfigured()) {
      console.warn('[Agentic] OPENAI_API_KEY ausente. Fallback acionado.');
      return null;
    }

    const client = getOpenAIClient();
    const model = aiService.getOpenAIModel();
    const instructions = buildAgenteAgenticPrompt({ clientProfile });
    const context = buildAgenticContext({ from, message, conversation, lead, clientProfile, nichoInfo });

    console.log('[Agentic] Provider usado: openai');
    console.log('[Agentic] Chamando Responses API');

    let response = await client.responses.create({
      model,
      instructions,
      input: JSON.stringify(context),
      tools: openAITools,
    });

    logUsage(response);

    for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration += 1) {
      const toolCalls = extractToolCalls(response);

      if (!toolCalls.length) {
        return parseFinalResponse(response);
      }

      const toolOutputs = [];

      for (const toolCall of toolCalls) {
        console.log(`[Agentic] Tool call solicitada: ${toolCall.name}`);
        const result = await executeToolCall({
          toolName: toolCall.name,
          argumentsJson: toolCall.arguments,
          context,
        });

        console.log(`[Agentic] Tool executada: ${toolCall.name} success=${Boolean(result?.success)}`);

        toolOutputs.push({
          type: 'function_call_output',
          call_id: toolCall.call_id,
          output: JSON.stringify(result),
        });
      }

      response = await client.responses.create({
        model,
        instructions,
        previous_response_id: response.id,
        input: toolOutputs,
        tools: openAITools,
      });

      logUsage(response);
    }

    console.error('[Agentic] Limite de tool calls atingido. Fallback acionado.');
    return null;
  } catch (error) {
    console.error('[Agentic] Fallback acionado:', {
      message: error.message,
      status: error.status,
      code: error.code,
      type: error.type,
    });
    return null;
  }
}

function getOpenAIClient() {
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY.trim(),
  });
}

function buildAgenticContext({ from, message, conversation, lead, clientProfile, nichoInfo }) {
  return {
    mensagemAtual: message,
    telefone: from,
    conversation,
    lead,
    clientProfile: clientProfile
      ? {
          id: clientProfile.id,
          telefone: clientProfile.telefone,
          nomeCliente: clientProfile.nomeCliente,
          tipoNegocio: clientProfile.tipoNegocio,
          aiProvider: clientProfile.aiProvider,
          descricao: clientProfile.descricao,
          promptPerfil: clientProfile.promptPerfil,
        }
      : null,
    nichoInfo: nichoInfo || null,
  };
}

function extractToolCalls(response) {
  const output = Array.isArray(response?.output) ? response.output : [];
  return output.filter((item) => item?.type === 'function_call' && item.name && item.call_id);
}

function parseFinalResponse(response) {
  const outputText = response?.output_text;

  if (!outputText) {
    console.error('[Agentic] Resposta final sem output_text.');
    return null;
  }

  const parsedOutput = safeJsonParse(outputText);

  if (!parsedOutput) {
    console.error('[Agentic] JSON final invalido.');
    return null;
  }

  if (!aiService.isValidAgentPayload(parsedOutput)) {
    console.error('[Agentic] Payload final invalido:', parsedOutput);
    return null;
  }

  console.log('[Agentic] Resposta final recebida');
  return parsedOutput;
}

function logUsage(response) {
  if (!response?.usage) {
    return;
  }

  const usage = response.usage;
  console.log('[Agentic] Usage', {
    inputTokens: usage.input_tokens,
    outputTokens: usage.output_tokens,
    totalTokens: usage.total_tokens,
  });
}

module.exports = {
  generateAgenticOpenAIResponse,
};
