const agentTools = require('./agent-tools.service');

const toolHandlers = {
  get_client_profile: agentTools.getClientProfileTool,
  save_lead: agentTools.saveLeadTool,
  create_hot_lead_notification: agentTools.createNotificationTool,
  finish_conversation: agentTools.finishConversationTool,
  restart_conversation: agentTools.restartConversationTool,
  get_plans: agentTools.getPlansTool,
  get_business_playbook: agentTools.getBusinessPlaybookTool,
};

async function executeToolCall({ toolName, argumentsJson, context } = {}) {
  try {
    const handler = toolHandlers[toolName];

    if (!handler) {
      return {
        success: false,
        error: 'Tool desconhecida.',
      };
    }

    const parsedArguments = parseArguments(argumentsJson);
    const enrichedArguments = enrichArguments({ toolName, parsedArguments, context });
    return handler(enrichedArguments);
  } catch {
    return {
      success: false,
      error: 'Falha controlada ao executar tool.',
    };
  }
}

function parseArguments(argumentsJson) {
  if (!argumentsJson) {
    return {};
  }

  if (typeof argumentsJson === 'object') {
    return argumentsJson;
  }

  try {
    const parsed = JSON.parse(argumentsJson);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function enrichArguments({ toolName, parsedArguments, context = {} }) {
  const phone = context.from || context.phone;

  if (toolName === 'get_client_profile') {
    return {
      phone: parsedArguments.phone || phone,
    };
  }

  if (toolName === 'save_lead') {
    return {
      lead: {
        ...(context.lead || {}),
        ...(parsedArguments.lead || {}),
        telefone: parsedArguments.lead?.telefone || context.lead?.telefone || phone,
        profileId: parsedArguments.lead?.profileId || context.clientProfile?.id || context.lead?.profileId || null,
        clientName:
          parsedArguments.lead?.clientName || context.clientProfile?.nomeCliente || context.lead?.clientName || null,
        aiProvider:
          parsedArguments.lead?.aiProvider || context.clientProfile?.aiProvider || context.lead?.aiProvider || null,
      },
    };
  }

  if (toolName === 'create_hot_lead_notification') {
    return {
      lead: {
        ...(context.lead || {}),
        ...(parsedArguments.lead || {}),
      },
      conversation: parsedArguments.conversation || context.conversation || null,
      result: parsedArguments.result || context.result || null,
    };
  }

  if (toolName === 'finish_conversation') {
    return {
      phone: parsedArguments.phone || phone,
      conversationId: parsedArguments.conversationId || context.conversation?.id || null,
    };
  }

  if (toolName === 'restart_conversation') {
    return {
      phone: parsedArguments.phone || phone,
    };
  }

  return parsedArguments;
}

module.exports = {
  executeToolCall,
};
