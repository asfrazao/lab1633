const openAITools = [
  {
    type: 'function',
    name: 'get_client_profile',
    description: 'Busca o perfil aplicado ao numero de WhatsApp do usuario.',
    parameters: {
      type: 'object',
      properties: {
        phone: {
          type: 'string',
          description: 'Telefone do usuario, podendo conter sufixos do WhatsApp.',
        },
      },
      required: ['phone'],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'save_lead',
    description: 'Salva ou atualiza os dados qualificados do lead.',
    parameters: {
      type: 'object',
      properties: {
        lead: {
          type: 'object',
          properties: {
            telefone: { type: 'string' },
            nome: { type: ['string', 'null'] },
            tipoNegocio: { type: ['string', 'null'] },
            dorPrincipal: { type: ['string', 'null'] },
            nivelInteresse: { type: 'string', enum: ['frio', 'morno', 'quente'] },
            profileId: { type: ['string', 'null'] },
            clientName: { type: ['string', 'null'] },
            aiProvider: { type: ['string', 'null'] },
          },
          required: ['telefone', 'nome', 'tipoNegocio', 'dorPrincipal', 'nivelInteresse'],
          additionalProperties: false,
        },
      },
      required: ['lead'],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'create_hot_lead_notification',
    description: 'Cria ou atualiza notificacao para Alessandro quando o lead estiver quente.',
    parameters: {
      type: 'object',
      properties: {
        lead: { type: 'object', additionalProperties: true },
        conversation: { type: 'object', additionalProperties: true },
        result: { type: 'object', additionalProperties: true },
      },
      required: ['lead', 'conversation', 'result'],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'finish_conversation',
    description: 'Marca a conversa como finalizada sem apagar o historico.',
    parameters: {
      type: 'object',
      properties: {
        phone: { type: 'string' },
        conversationId: { type: ['string', 'null'] },
      },
      required: ['phone'],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'restart_conversation',
    description: 'Reinicia a conversa para identificar negocio sem apagar lead antigo.',
    parameters: {
      type: 'object',
      properties: {
        phone: { type: 'string' },
      },
      required: ['phone'],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'get_plans',
    description: 'Lista opcoes comerciais simuladas sem valores monetarios fechados.',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'get_business_playbook',
    description: 'Busca o roteiro de atendimento adequado para um tipo de negocio.',
    parameters: {
      type: 'object',
      properties: {
        tipoNegocio: {
          type: 'string',
          description: 'Tipo de negocio do lead, como doceria, barbearia, letreiros ou generico.',
        },
      },
      required: ['tipoNegocio'],
      additionalProperties: false,
    },
  },
];

function getAvailableToolNames() {
  return openAITools.map((tool) => tool.name);
}

module.exports = {
  getAvailableToolNames,
  openAITools,
};
