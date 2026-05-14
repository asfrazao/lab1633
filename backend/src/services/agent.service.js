const conversationService = require('./conversation.service');
const leadService = require('./lead.service');
const { nichos } = require('../prompts/nichos.prompt');

const hotInterestKeywords = [
  'preço',
  'preco',
  'valor',
  'quanto custa',
  'implantação',
  'implantacao',
  'teste',
  'contratar',
  'contratação',
  'contratacao',
  'colocar no meu negócio',
  'colocar no meu negocio',
  'quero colocar',
  'quero implantar',
];

const greetingKeywords = ['oi', 'ola', 'olá', 'bom dia', 'boa tarde', 'boa noite'];

async function processMessage({ from, message }) {
  const existingConversation = await conversationService.findByTelefone(from);
  let conversation = existingConversation || conversationService.createConversation(from);

  conversation = conversationService.appendMessage(conversation, 'cliente', message);
  const fallbackResult = generateFallbackResponse({ conversation, message });

  conversation = conversationService.appendMessage(fallbackResult.conversation, 'agente', fallbackResult.resposta);
  conversation = await conversationService.save(conversation);

  const lead = await leadService.upsertFromConversation(conversation);

  return {
    resposta: fallbackResult.resposta,
    estado: conversation.estado,
    lead: {
      telefone: lead.telefone,
      tipoNegocio: lead.tipoNegocio,
      nivelInteresse: lead.nivelInteresse,
    },
    conversationId: conversation.id,
    source: 'fallback',
  };
}

function generateFallbackResponse({ conversation, message }) {
  const detectedBusiness = identifyBusinessType(message) || conversation.tipoNegocio;
  const nivelInteresse = classifyInterest(message, detectedBusiness);
  const nextState = getNextState(conversation.estado, {
    detectedBusiness,
    message,
  });
  const dorPrincipal = inferPain(message, detectedBusiness) || conversation.dorPrincipal;
  const nome = inferName(message, conversation.estado) || conversation.nome;

  conversation = {
    ...conversation,
    estado: nextState,
    tipoNegocio: detectedBusiness || null,
    dorPrincipal,
    nome,
    nivelInteresse: strongestInterest(conversation.nivelInteresse, nivelInteresse),
  };

  const resposta = buildResponse(conversation, message);

  return {
    resposta,
    conversation,
    acao: conversation.nivelInteresse === 'quente' ? 'notificar_humano' : 'continuar_conversa',
  };
}

function identifyBusinessType(message) {
  const normalizedMessage = normalizeText(message);

  return Object.entries(nichos).find(([, nicho]) => {
    return nicho.palavrasChave.some((keyword) => normalizedMessage.includes(normalizeText(keyword)));
  })?.[0] || null;
}

function classifyInterest(message, detectedBusiness) {
  const normalizedMessage = normalizeText(message);
  const hasHotIntent = hotInterestKeywords.some((keyword) => normalizedMessage.includes(normalizeText(keyword)));

  if (hasHotIntent) {
    return 'quente';
  }

  if (detectedBusiness) {
    return 'morno';
  }

  if (greetingKeywords.some((keyword) => normalizedMessage === normalizeText(keyword))) {
    return 'frio';
  }

  return 'frio';
}

function getNextState(currentState, context) {
  if (!context.detectedBusiness) {
    return 'identificar_negocio';
  }

  const transitions = {
    inicio: 'diagnosticar_dor',
    identificar_negocio: 'diagnosticar_dor',
    diagnosticar_dor: 'simular_atendimento',
    simular_atendimento: 'apresentar_solucao',
    apresentar_solucao: 'coletar_nome',
    coletar_nome: 'coletar_interesse',
    coletar_interesse: 'encaminhar_humano',
    encaminhar_humano: 'finalizado',
    finalizado: 'finalizado',
  };

  return transitions[currentState] || 'identificar_negocio';
}

function inferPain(message, tipoNegocio) {
  const normalizedMessage = normalizeText(message);

  if (normalizedMessage.includes('vender mais')) {
    return 'quer vender mais pelo WhatsApp';
  }

  if (normalizedMessage.includes('demora') || normalizedMessage.includes('responder')) {
    return 'demora para responder clientes';
  }

  if (normalizedMessage.includes('pedido') || normalizedMessage.includes('orcamento') || normalizedMessage.includes('orçamento')) {
    return 'pedidos ou orçamentos incompletos';
  }

  if (tipoNegocio && nichos[tipoNegocio]?.doresComuns?.length) {
    return nichos[tipoNegocio].doresComuns[0];
  }

  return null;
}

function inferName(message, currentState) {
  if (currentState !== 'coletar_nome') {
    return null;
  }

  const normalizedMessage = message.trim();

  if (normalizedMessage.length < 2 || normalizedMessage.length > 80) {
    return null;
  }

  return normalizedMessage;
}

function buildResponse(conversation, message) {
  if (!conversation.tipoNegocio) {
    return 'Oi, eu sou o Agente Comercial Lab1633. Eu mostro como agentes de IA podem atender clientes pelo WhatsApp, responder dúvidas e organizar pedidos. Qual é o seu tipo de negócio hoje?';
  }

  const nicho = nichos[conversation.tipoNegocio];

  if (conversation.estado === 'diagnosticar_dor') {
    return `Perfeito. ${nicho.exemploResposta} Hoje você perde muito tempo respondendo esse tipo de pedido?`;
  }

  if (conversation.estado === 'simular_atendimento') {
    return `Entendi. Em uma simulação real, o agente começaria perguntando: "${nicho.perguntasSimulacao[0]}" e seguiria coletando as informações sem deixar o cliente esperando.`;
  }

  if (conversation.estado === 'apresentar_solucao') {
    return `A solução da Lab1633 seria um agente treinado para o seu atendimento, com perguntas do seu negócio, captação de dados do cliente e encaminhamento para uma pessoa quando houver intenção de compra.`;
  }

  if (conversation.estado === 'coletar_nome') {
    return 'Para eu registrar esse interesse e encaminhar corretamente, qual é o seu nome?';
  }

  if (conversation.estado === 'coletar_interesse') {
    return `Obrigado, ${conversation.nome || 'perfeito'}. Você gostaria de ver um teste, receber valores ou falar com alguém da Lab1633?`;
  }

  if (conversation.estado === 'encaminhar_humano') {
    return 'Certo. Vou deixar seu contato como prioridade para um atendimento humano da Lab1633 continuar a conversa.';
  }

  return 'Contato registrado. A Lab1633 pode continuar com uma demonstração mais completa no próximo atendimento.';
}

function strongestInterest(currentInterest, nextInterest) {
  const levels = {
    frio: 1,
    morno: 2,
    quente: 3,
  };

  return levels[nextInterest] > levels[currentInterest] ? nextInterest : currentInterest;
}

function normalizeText(value) {
  return String(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

module.exports = {
  generateFallbackResponse,
  processMessage,
};
