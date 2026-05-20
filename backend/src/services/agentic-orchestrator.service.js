const aiOrchestratorService = require('./ai-orchestrator.service');
const agentTools = require('./agent-tools.service');
const chatFlowService = require('./chat-flow.service');
const clientProfileService = require('./client-profile.service');

async function runAgenticTurn({ from, message } = {}) {
  const telefone = clientProfileService.normalizePhone(from);
  const clientProfile = await clientProfileService.getClientProfileByPhone(telefone);

  // Ponto futuro de integracao com OpenAI tools/function calling.
  // Nesta etapa, o fluxo existente continua sendo a fonte de verdade para
  // conversa, lead, notificacao e resposta final.
  const response = await chatFlowService.processIncomingMessage({
    from: telefone || from,
    message,
  });

  return {
    ...response,
    clientProfile: {
      id: clientProfile.id,
      nomeCliente: clientProfile.nomeCliente,
      tipoNegocio: clientProfile.tipoNegocio,
      aiProvider: clientProfile.aiProvider,
    },
  };
}

module.exports = {
  runAgenticTurn,
  tools: agentTools,
  aiOrchestratorService,
};
