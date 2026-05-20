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
  const genericBusiness = detectGenericBusiness(message, conversation);
  const detectedBusiness =
    identifyBusinessType(message) ||
    (genericBusiness.detected ? genericBusiness.tipoNegocio : null) ||
    conversation.tipoNegocio ||
    lead?.tipoNegocio ||
    null;
  const resolvedNichoInfo = nichoInfo || (detectedBusiness ? nichos[detectedBusiness] : null);
  const businessPain = detectBusinessPain(message, conversation);
  const isHotLead = detectBuyingIntent(message);
  const nome = inferName(message, currentState) || conversation.nome || lead?.nome || null;
  const hasBusiness = Boolean(detectedBusiness);
  const dorPrincipal =
    businessPain.dorPrincipal ||
    conversation.dorPrincipal ||
    lead?.dorPrincipal ||
    null;
  const stateOverride = getStateSpecificResponse({
    currentState,
    message,
    tipoNegocio: detectedBusiness,
    nichoInfo: resolvedNichoInfo,
    dorPrincipal,
    nome,
  });

  if (stateOverride) {
    return {
      resposta: stateOverride.resposta,
      estado: stateOverride.estado,
      lead: {
        telefone: from,
        nome,
        tipoNegocio: detectedBusiness,
        dorPrincipal: stateOverride.dorPrincipal || dorPrincipal,
        nivelInteresse: stateOverride.nivelInteresse,
      },
      acao: stateOverride.acao,
    };
  }

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
    currentState,
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

function detectGenericBusiness(message, conversation = {}) {
  const cleanedMessage = cleanBusinessText(message);
  const patterns = [
    { regex: /^trabalho com\s+(.+)$/, prefix: '' },
    { regex: /^faco\s+(.+)$/, prefix: '' },
    { regex: /^tenho uma\s+(.+)$/, prefix: '' },
    { regex: /^tenho um\s+(.+)$/, prefix: '' },
    { regex: /^sou\s+(.+)$/, prefix: '' },
    { regex: /^vendo\s+(.+)$/, prefix: 'venda de ' },
  ];

  for (const pattern of patterns) {
    const match = cleanedMessage.match(pattern.regex);

    if (match?.[1]) {
      const tipoNegocio = normalizeBusinessLabel(`${pattern.prefix}${match[1]}`);

      if (tipoNegocio) {
        return {
          detected: true,
          tipoNegocio,
          descricao: cleanedMessage,
        };
      }
    }
  }

  if (isLikelyBusinessShortAnswer(message, conversation)) {
    const tipoNegocio = normalizeBusinessType(message);

    if (tipoNegocio) {
      return {
        detected: true,
        tipoNegocio,
        descricao: cleanedMessage,
      };
    }
  }

  return {
    detected: false,
    tipoNegocio: null,
    descricao: null,
  };
}

function isLikelyBusinessShortAnswer(message, conversation = {}) {
  const state = conversation.estado || 'inicio';

  if (!['inicio', 'identificar_negocio'].includes(state)) {
    return false;
  }

  const normalizedMessage = cleanBusinessText(message);

  if (!normalizedMessage) {
    return false;
  }

  const words = normalizedMessage.split(/\s+/).filter(Boolean);

  if (words.length < 1 || words.length > 5) {
    return false;
  }

  if (isGreeting(normalizedMessage) || detectBuyingIntent(normalizedMessage) || detectBusinessPain(normalizedMessage).hasPain) {
    return false;
  }

  const rejectedShortAnswers = ['sim', 'nao', 'talvez', 'quero', 'ok', 'teste', 'beleza', 'certo', 'entendi'];

  return !rejectedShortAnswers.includes(normalizedMessage);
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

function isPositiveConfirmation(message) {
  const normalizedMessage = normalizeIntentText(message);
  const confirmations = [
    'sim',
    'ss',
    'claro',
    'pode ser',
    'faz sentido',
    'quero',
    'quero sim',
    'tenho interesse',
    'gostei',
    'interessante',
    'legal',
    'bora',
    'vamos',
    'vamos testar',
    'pode testar',
    'quero testar',
    'quero ver',
    'gostei da ideia',
    'faz sim',
  ];

  return confirmations.includes(normalizedMessage);
}

function isSoftInterest(message) {
  const normalizedMessage = normalizeIntentText(message);
  const softInterestMessages = [
    'interessante',
    'legal',
    'gostei',
    'bacana',
    'bom',
    'faz sentido',
    'entendi',
    'certo',
  ];

  return softInterestMessages.includes(normalizedMessage);
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

function detectBusinessPain(message, conversation = {}) {
  const normalizedMessage = normalizeText(message);
  const currentState = conversation.estado || 'inicio';

  if (currentState === 'diagnosticar_dor' && ['vendas', 'venda'].includes(normalizedMessage.trim())) {
    return {
      hasPain: true,
      dorPrincipal: 'quer vender mais ou fechar mais oportunidades pelo WhatsApp',
    };
  }

  if (
    normalizedMessage.includes('orcamento') &&
    (
      normalizedMessage.includes('responder') ||
      normalizedMessage.includes('demoro') ||
      normalizedMessage.includes('demora') ||
      normalizedMessage.includes('perco tempo')
    )
  ) {
    return {
      hasPain: true,
      dorPrincipal: 'perde tempo respondendo orcamentos ou pedidos pelo WhatsApp',
    };
  }

  if (
    normalizedMessage.includes('demoro para responder') ||
    normalizedMessage.includes('demora para responder') ||
    normalizedMessage.includes('perco tempo respondendo') ||
    normalizedMessage.includes('nao consigo responder rapido') ||
    normalizedMessage.includes('esqueco de responder') ||
    normalizedMessage.includes('muita mensagem')
  ) {
    return {
      hasPain: true,
      dorPrincipal: 'demora para responder clientes',
    };
  }

  if (
    normalizedMessage.includes('muitos orcamentos') ||
    normalizedMessage.includes('cliente pede orcamento') ||
    normalizedMessage.includes('pedido incompleto')
  ) {
    return {
      hasPain: true,
      dorPrincipal: 'perde tempo respondendo orcamentos ou pedidos pelo WhatsApp',
    };
  }

  if (
    normalizedMessage.includes('bagunca no whatsapp') ||
    normalizedMessage.includes('whatsapp baguncado') ||
    normalizedMessage.includes('whatsapp baguncada')
  ) {
    return {
      hasPain: true,
      dorPrincipal: 'falta de organizacao no atendimento pelo WhatsApp',
    };
  }

  if (normalizedMessage.includes('nao fecho venda') || normalizedMessage.includes('cliente some')) {
    return {
      hasPain: true,
      dorPrincipal: 'perde oportunidades de venda pelo WhatsApp',
    };
  }

  if (normalizedMessage.includes('preciso vender mais')) {
    return {
      hasPain: true,
      dorPrincipal: 'quer vender mais pelo WhatsApp',
    };
  }

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

function getStateSpecificResponse({ currentState, message, tipoNegocio, nichoInfo, dorPrincipal, nome }) {
  if (currentState === 'finalizado') {
    if (isRestartRequest(message)) {
      return {
        resposta: 'Claro. Vamos comecar um novo atendimento. Qual e o seu tipo de negocio?',
        estado: 'identificar_negocio',
        dorPrincipal: null,
        nivelInteresse: 'frio',
        acao: 'continuar_conversa',
      };
    }

    return {
      resposta: 'Seu contato ja foi registrado. O Alessandro pode continuar o atendimento com voce por aqui.',
      estado: 'finalizado',
      dorPrincipal,
      nivelInteresse: 'quente',
      acao: 'finalizar',
    };
  }

  if (currentState === 'coletar_nome' && nome) {
    return {
      resposta: `Perfeito, ${nome}. Vou encaminhar seu contato para o Alessandro avaliar o melhor formato para o seu negocio. Em breve ele pode continuar a conversa com voce por aqui.`,
      estado: 'finalizado',
      dorPrincipal,
      nivelInteresse: 'quente',
      acao: 'notificar_humano',
    };
  }

  if (currentState === 'coletar_interesse' && isPositiveConfirmation(message)) {
    return {
      resposta: 'Perfeito. Posso encaminhar isso para o Alessandro avaliar o melhor formato para o seu negocio. Qual e o seu nome?',
      estado: 'coletar_nome',
      dorPrincipal,
      nivelInteresse: 'quente',
      acao: 'notificar_humano',
    };
  }

  if (currentState === 'apresentar_solucao' && isSoftInterest(message)) {
    return {
      resposta: 'Faz sentido testar esse tipo de agente no seu WhatsApp para ver como ele organizaria os atendimentos?',
      estado: 'coletar_interesse',
      dorPrincipal,
      nivelInteresse: 'morno',
      acao: 'continuar_conversa',
    };
  }

  if (currentState === 'apresentar_solucao' && isPositiveConfirmation(message)) {
    return {
      resposta: 'Perfeito. Posso encaminhar isso para o Alessandro avaliar o melhor formato para o seu negocio. Qual e o seu nome?',
      estado: 'coletar_nome',
      dorPrincipal,
      nivelInteresse: 'quente',
      acao: 'notificar_humano',
    };
  }

  if (currentState === 'simular_atendimento' && isSoftInterest(message)) {
    return {
      resposta: buildSolutionResponse({ tipoNegocio, nichoInfo, dorPrincipal }),
      estado: 'apresentar_solucao',
      dorPrincipal,
      nivelInteresse: 'morno',
      acao: 'continuar_conversa',
    };
  }

  return null;
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

  if (currentState === 'coletar_interesse') {
    return 'coletar_interesse';
  }

  if (!hasBusiness) {
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

function buildResponse({ currentState, estado, tipoNegocio, nichoInfo, dorPrincipal, nome, isHotLead }) {
  if (estado === 'identificar_negocio') {
    if (currentState && currentState !== 'inicio') {
      return 'Entendi. So para eu te mostrar um exemplo mais certeiro: seu negocio vende produto, presta servico ou faz atendimento/agendamento pelo WhatsApp?';
    }

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
    return buildSimulationResponse(tipoNegocio, nichoInfo, dorPrincipal);
  }

  if (estado === 'apresentar_solucao') {
    return buildSolutionResponse({ tipoNegocio, nichoInfo, dorPrincipal });
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

  if (questions[tipoNegocio] || nichoInfo?.exemploResposta) {
    return questions[tipoNegocio] || nichoInfo.exemploResposta;
  }

  if (isSignBusiness(tipoNegocio)) {
    return 'Legal, trabalhar com letreiros costuma envolver pedidos de orcamento, medidas, prazos, modelos e referencias pelo WhatsApp. Hoje sua maior dificuldade e responder rapido, organizar os pedidos ou fechar mais vendas?';
  }

  return `Legal. Nesse tipo de negocio, um agente de IA pode ajudar a responder duvidas, coletar informacoes do cliente e organizar oportunidades pelo WhatsApp. Hoje sua maior dificuldade e responder rapido, organizar pedidos ou fechar mais vendas?`;
}

function buildSimulationResponse(tipoNegocio, nichoInfo, dorPrincipal) {
  if (nichoInfo?.exemploResposta) {
    return `${nichoInfo.exemploResposta} Quer que eu explique como a Lab1633 montaria esse fluxo para voce?`;
  }

  if (isSignBusiness(tipoNegocio)) {
    if (isSalesPain(dorPrincipal)) {
      return 'Imagine um cliente chamando sobre letreiros. O agente perguntaria o tipo de letreiro, medidas, prazo, local de instalacao e referencia visual. Depois entregaria tudo organizado para voce responder mais rapido e aumentar as chances de fechar a venda.';
    }

    return 'Imagine um cliente pedindo um letreiro. O agente perguntaria o tipo de letreiro, medidas aproximadas, material desejado, prazo, local de instalacao e se o cliente tem alguma referencia visual. No fim, voce receberia o pedido mais organizado para avaliar e responder.';
  }

  return 'Imagine um cliente chamando no WhatsApp. O agente faria as primeiras perguntas, entenderia o que ele precisa, coletaria dados importantes e te entregaria um resumo para voce responder com mais velocidade.';
}

function buildSolutionResponse({ tipoNegocio, nichoInfo, dorPrincipal }) {
  if (isSignBusiness(tipoNegocio) || !nichoInfo?.beneficioPrincipal) {
    return 'A Lab1633 configuraria um agente com as perguntas do seu atendimento para organizar o WhatsApp do seu negocio e reduzir respostas manuais. Faz sentido testar isso no seu caso?';
  }

  return `A Lab1633 configuraria um agente com as perguntas do seu atendimento para ${nichoInfo.beneficioPrincipal} Isso reduziria sua dor de ${dorPrincipal || 'responder tudo manualmente'}. Faz sentido testar isso no seu caso?`;
}

function formatBusiness(tipoNegocio) {
  const labels = {
    doceria: 'uma doceria',
    marmitaria: 'uma marmitaria',
    barbearia: 'uma barbearia',
    assistencia_tecnica: 'uma assistencia tecnica',
    igreja_eventos: 'igrejas ou eventos',
  };

  return labels[tipoNegocio] || `trabalhar com ${tipoNegocio || 'esse negocio'}`;
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

function cleanBusinessText(value) {
  return normalizeText(value)
    .replace(/[?!.,;:]+/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);
}

function normalizeIntentText(value) {
  return normalizeText(value)
    .replace(/[?!.,;:]+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function isRestartRequest(message) {
  const normalizedMessage = normalizeIntentText(message);
  const restartRequests = [
    'comecar de novo',
    'reiniciar',
    'novo atendimento',
    'outro negocio',
  ].map(normalizeIntentText);

  return restartRequests.includes(normalizedMessage);
}

function normalizeBusinessLabel(value) {
  return normalizeBusinessType(value);
}

function normalizeBusinessType(value) {
  return cleanBusinessText(value)
    .replace(/^(uma|um|uns|umas|a|o|os|as)\s+/, '')
    .trim()
    .slice(0, 60);
}

function isSignBusiness(tipoNegocio) {
  return normalizeText(tipoNegocio || '').includes('letreiro');
}

function isSalesPain(dorPrincipal) {
  const normalizedPain = normalizeText(dorPrincipal || '');
  return normalizedPain.includes('vender') || normalizedPain.includes('venda') || normalizedPain.includes('oportunidade');
}

module.exports = {
  generateMockAgentResponse,
};
