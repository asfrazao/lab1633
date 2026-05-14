const { nichos } = require('../prompts/nichos.prompt');

const buyingIntentKeywords = [
  'quanto custa',
  'preco',
  'valor',
  'plano',
  'mensalidade',
  'contratar',
  'quero contratar',
  'quero colocar',
  'quero testar',
  'teste',
  'proposta',
  'implantacao',
  'implementar',
  'instalar',
  'como faco',
  'como comecar',
  'comecar',
  'quero no meu negocio',
  'falar com alguem',
  'falar com o alessandro',
];

const buyingBudgetExpressions = [
  'fazer um orcamento para mim',
  'faz um orcamento para mim',
  'manda um orcamento',
  'me manda um orcamento',
  'quero um orcamento da lab1633',
  'orcamento da lab1633',
  'orcamento desse agente',
  'orcamento para esse agente',
];

const greetingKeywords = ['oi', 'ola', 'bom dia', 'boa tarde', 'boa noite', 'e ai'];

async function generateMockAgentResponse({ from, message, conversation, lead, nichoInfo }) {
  const currentState = conversation.estado || 'inicio';
  const detectedBusiness = identifyBusinessType(message) || conversation.tipoNegocio || lead?.tipoNegocio || null;
  const resolvedNichoInfo = nichoInfo || (detectedBusiness ? nichos[detectedBusiness] : null);
  const businessPain = detectBusinessPain(message);
  const isHotLead = detectBuyingIntent(message);
  const nome = inferName(message, currentState) || conversation.nome || lead?.nome || null;
  const hasBusiness = Boolean(detectedBusiness);
  const dorPrincipal =
    businessPain.dorPrincipal ||
    conversation.dorPrincipal ||
    lead?.dorPrincipal ||
    null;
  const nivelInteresse = strongestInterest(
    conversation.nivelInteresse || lead?.nivelInteresse || 'frio',
    classifyInterest({ hasBusiness, hasPain: businessPain.hasPain || Boolean(dorPrincipal), isHotLead })
  );
  const estado = getNextState({
    currentState,
    hasBusiness,
    hasPain: businessPain.hasPain || Boolean(dorPrincipal),
    isGreeting: isGreeting(message),
    isHotLead,
    nome,
  });
  const resposta = buildResponse({
    estado,
    tipoNegocio: detectedBusiness,
    nichoInfo: resolvedNichoInfo,
    dorPrincipal,
    nome,
    isHotLead,
  });

  return {
    resposta,
    estado,
    lead: {
      telefone: from,
      nome,
      tipoNegocio: detectedBusiness,
      dorPrincipal,
      nivelInteresse,
    },
    acao: isHotLead || nivelInteresse === 'quente' ? 'notificar_humano' : 'atualizar_lead',
  };
}

function identifyBusinessType(message) {
  const normalizedMessage = normalizeText(message);

  return Object.entries(nichos).find(([, nicho]) => {
    return nicho.palavrasChave.some((keyword) => normalizedMessage.includes(normalizeText(keyword)));
  })?.[0] || null;
}

function isGreeting(message) {
  const normalizedMessage = normalizeText(message).trim();
  return greetingKeywords.some((keyword) => normalizedMessage === normalizeText(keyword));
}

function detectBuyingIntent(message) {
  const normalizedMessage = normalizeText(message);

  if (buyingBudgetExpressions.some((expression) => normalizedMessage.includes(normalizeText(expression)))) {
    return true;
  }

  return buyingIntentKeywords.some((keyword) => normalizedMessage.includes(normalizeText(keyword)));
}

function classifyInterest({ hasBusiness, hasPain, isHotLead }) {
  if (isHotLead) {
    return 'quente';
  }

  if (hasBusiness || hasPain) {
    return 'morno';
  }

  return 'frio';
}

function detectBusinessPain(message) {
  const normalizedMessage = normalizeText(message);

  if (normalizedMessage.includes('vender mais')) {
    return {
      hasPain: true,
      dorPrincipal: 'quer vender mais pelo WhatsApp',
    };
  }

  if (normalizedMessage.includes('orcamento') || normalizedMessage.includes('pedido') || normalizedMessage.includes('bolo')) {
    return {
      hasPain: true,
      dorPrincipal: 'perde tempo respondendo orcamentos ou pedidos pelo WhatsApp',
    };
  }

  if (normalizedMessage.includes('agendamento') || normalizedMessage.includes('agenda') || normalizedMessage.includes('horario')) {
    return {
      hasPain: true,
      dorPrincipal: 'quer automatizar agendamentos pelo WhatsApp',
    };
  }

  if (normalizedMessage.includes('demora') || normalizedMessage.includes('responder')) {
    return {
      hasPain: true,
      dorPrincipal: 'demora para responder clientes',
    };
  }

  if (normalizedMessage.includes('triagem') || normalizedMessage.includes('conserto') || normalizedMessage.includes('defeito')) {
    return {
      hasPain: true,
      dorPrincipal: 'precisa organizar triagem inicial',
    };
  }

  if (normalizedMessage.includes('inscricao') || normalizedMessage.includes('evento') || normalizedMessage.includes('informacao')) {
    return {
      hasPain: true,
      dorPrincipal: 'precisa organizar informacoes e inscricoes pelo WhatsApp',
    };
  }

  if (
    normalizedMessage.includes('cliente pergunta') ||
    normalizedMessage.includes('muito atendimento manual') ||
    normalizedMessage.includes('falta de organizacao') ||
    normalizedMessage.includes('baguncado') ||
    normalizedMessage.includes('baguncada') ||
    normalizedMessage.includes('incompleto')
  ) {
    return {
      hasPain: true,
      dorPrincipal: 'falta de organizacao no atendimento pelo WhatsApp',
    };
  }

  return {
    hasPain: false,
    dorPrincipal: null,
  };
}

function getDefaultPain(tipoNegocio) {
  if (!tipoNegocio || !nichos[tipoNegocio]?.doresComuns?.length) {
    return null;
  }

  return nichos[tipoNegocio].doresComuns[0];
}

function inferName(message, currentState) {
  const trimmedMessage = String(message).trim();
  const normalizedMessage = normalizeText(trimmedMessage);
  const explicitNameMatch = trimmedMessage.match(/^(?:meu nome (?:e|é)|me chamo|sou a|sou o|sou|e|é)\s+([a-zA-ZÀ-ÿ]+(?:\s+[a-zA-ZÀ-ÿ]+)?)/i);
  const tolerantNameMatch = trimmedMessage.match(/^meu nome\s+\S+\s+(.{2,60})$/i);

  if (explicitNameMatch && currentState === 'coletar_nome') {
    return cleanName(explicitNameMatch[1]);
  }

  if (tolerantNameMatch && currentState === 'coletar_nome') {
    return cleanName(tolerantNameMatch[1]);
  }

  if (currentState !== 'coletar_nome') {
    return null;
  }

  const words = trimmedMessage.split(/\s+/).filter(Boolean);

  if (
    words.length >= 1 &&
    words.length <= 2 &&
    !trimmedMessage.includes('?') &&
    !detectBuyingIntent(trimmedMessage) &&
    !isGreeting(trimmedMessage) &&
    !['sim', 'nao', 'não', 'ok', 'beleza'].includes(normalizedMessage)
  ) {
    return cleanName(trimmedMessage);
  }

  return null;
}

function cleanName(value) {
  const name = String(value).trim().replace(/[^\p{L}\s'-]/gu, '').trim();
  return name || null;
}

function getNextState({ currentState, hasBusiness, hasPain, isGreeting, isHotLead, nome }) {
  if (isHotLead) {
    return nome ? 'encaminhar_humano' : 'coletar_nome';
  }

  if (currentState === 'coletar_nome' && nome) {
    return 'encaminhar_humano';
  }

  if (currentState === 'coletar_nome') {
    return 'coletar_nome';
  }

  if (isGreeting || !hasBusiness) {
    return 'identificar_negocio';
  }

  if (currentState === 'inicio' || currentState === 'identificar_negocio') {
    return 'diagnosticar_dor';
  }

  if (currentState === 'diagnosticar_dor' && hasPain) {
    return 'simular_atendimento';
  }

  if (currentState === 'diagnosticar_dor') {
    return 'simular_atendimento';
  }

  if (currentState === 'simular_atendimento') {
    return 'apresentar_solucao';
  }

  if (currentState === 'apresentar_solucao') {
    return 'coletar_interesse';
  }

  if (currentState === 'encaminhar_humano') {
    return 'finalizado';
  }

  return currentState === 'finalizado' ? 'finalizado' : 'diagnosticar_dor';
}

function buildResponse({ estado, tipoNegocio, nichoInfo, dorPrincipal, nome, isHotLead }) {
  if (estado === 'identificar_negocio') {
    return 'Oi, eu sou o Agente Comercial da Lab1633. A gente cria agentes de IA para atendimento no WhatsApp. Qual e o seu tipo de negocio?';
  }

  if (isHotLead && estado === 'coletar_nome') {
    return 'Consigo encaminhar isso para o Alessandro avaliar o melhor formato para o seu negocio. Qual e o seu nome?';
  }

  if (estado === 'encaminhar_humano') {
    return `Perfeito${nome ? `, ${nome}` : ''}. Vou encaminhar seu contato para o Alessandro avaliar o melhor formato para o seu negocio.`;
  }

  if (estado === 'finalizado') {
    return 'Contato registrado. O Alessandro pode continuar a conversa com voce pelos proximos passos.';
  }

  if (estado === 'diagnosticar_dor') {
    return buildDiagnosticResponse(tipoNegocio, nichoInfo);
  }

  if (estado === 'simular_atendimento') {
    return buildSimulationResponse(tipoNegocio, nichoInfo);
  }

  if (estado === 'apresentar_solucao') {
    return `A Lab1633 configuraria um agente com as perguntas do seu atendimento para ${nichoInfo?.beneficioPrincipal || 'organizar o WhatsApp do seu negocio'} Isso reduziria sua dor de ${dorPrincipal || 'responder tudo manualmente'}.`;
  }

  if (estado === 'coletar_interesse') {
    return 'Faz sentido testar esse tipo de agente no seu WhatsApp?';
  }

  return buildDiagnosticResponse(tipoNegocio, nichoInfo);
}

function buildDiagnosticResponse(tipoNegocio, nichoInfo) {
  const businessLabel = formatBusiness(tipoNegocio);
  const defaultQuestion = `Legal, ${businessLabel} combina muito com atendimento automatizado. Qual e a maior dor hoje no WhatsApp?`;
  const questions = {
    doceria: 'Legal, doceria costuma perder muito tempo com orcamentos incompletos. Hoje sua maior dor no WhatsApp e pedido incompleto, demora para responder ou muita pergunta repetida?',
    marmitaria: 'Legal, marmitaria recebe muitos pedidos rapidos pelo WhatsApp. Hoje sua maior dor e pedido incompleto, endereco errado ou demora para confirmar pagamento?',
    barbearia: 'Legal, barbearia costuma sofrer com agenda e remarcacao. Hoje sua maior dor e responder horarios, confirmar servicos ou lembrar clientes?',
    assistencia_tecnica: 'Legal, assistencia tecnica precisa de triagem bem feita. Hoje sua maior dor e entender o defeito, pedir fotos ou filtrar orcamentos?',
    igreja_eventos: 'Legal, igrejas e eventos recebem muitas perguntas repetidas. Hoje sua maior dor e horarios, inscricoes ou organizar pedidos recebidos?',
  };

  return questions[tipoNegocio] || `${nichoInfo?.exemploResposta || defaultQuestion}`;
}

function buildSimulationResponse(tipoNegocio, nichoInfo) {
  if (nichoInfo?.exemploResposta) {
    return `${nichoInfo.exemploResposta} Quer que eu explique como a Lab1633 montaria esse fluxo para voce?`;
  }

  return 'O agente faria uma pergunta por vez, coletaria as informacoes importantes e entregaria tudo organizado para voce. Quer que eu explique como a Lab1633 montaria esse fluxo?';
}

function formatBusiness(tipoNegocio) {
  const labels = {
    doceria: 'uma doceria',
    marmitaria: 'uma marmitaria',
    barbearia: 'uma barbearia',
    assistencia_tecnica: 'uma assistencia tecnica',
    igreja_eventos: 'igrejas ou eventos',
  };

  return labels[tipoNegocio] || 'esse negocio';
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
  generateMockAgentResponse,
};
