const nichos = {
  doceria: {
    nome: 'doceria',
    palavrasChave: ['doceria', 'bolo', 'bolos', 'doce', 'doces', 'confeitaria', 'brigadeiro', 'festa', 'kit festa'],
    doresComuns: [
      'pedidos incompletos',
      'demora para responder orcamento',
      'cliente pergunta preco sem informar data ou tamanho',
      'muitas mensagens repetidas',
    ],
    perguntasSimulacao: [
      'Para qual data e o evento?',
      'Quantas pessoas?',
      'Voce quer bolo, doces ou kit festa?',
      'Tem algum tema?',
      'Sera retirada ou entrega?',
    ],
    beneficioPrincipal:
      'coletar pedidos completos de bolos, doces e kits festa antes de chegar para o dono do negocio.',
    exemploResposta:
      'Imagine um cliente pedindo um bolo. O agente pergunta data do evento, quantidade de pessoas, sabor, tema e retirada ou entrega. No fim, voce recebe o pedido organizado.',
  },
  marmitaria: {
    nome: 'marmitaria',
    palavrasChave: ['marmita', 'marmitaria', 'delivery', 'almoco', 'comida', 'restaurante', 'cardapio'],
    doresComuns: [
      'perguntas repetidas sobre cardapio',
      'pedido incompleto',
      'cliente esquece endereco',
      'demora na confirmacao',
    ],
    perguntasSimulacao: [
      'Voce quer marmita pequena, media ou grande?',
      'Qual proteina?',
      'Qual acompanhamento?',
      'Qual endereco de entrega?',
      'Qual forma de pagamento?',
    ],
    beneficioPrincipal:
      'organizar pedidos, endereco e pagamento antes de passar para a cozinha ou atendimento.',
    exemploResposta:
      'Imagine um cliente pedindo almoco. O agente apresenta as opcoes, confirma tamanho, proteina, acompanhamento, endereco e pagamento. No fim, a equipe recebe o pedido pronto.',
  },
  barbearia: {
    nome: 'barbearia',
    palavrasChave: ['barbearia', 'barbeiro', 'corte', 'cabelo', 'salao', 'manicure', 'estetica', 'agendamento'],
    doresComuns: [
      'cliente pergunta horario disponivel',
      'cliente esquece agendamento',
      'pergunta preco o tempo todo',
      'atendimento fora de horario',
    ],
    perguntasSimulacao: [
      'Qual servico voce deseja?',
      'Qual dia prefere?',
      'Manha, tarde ou noite?',
      'Tem profissional de preferencia?',
      'Quer receber lembrete?',
    ],
    beneficioPrincipal:
      'organizar agendamentos, servicos e lembretes pelo WhatsApp sem depender de resposta manual o tempo todo.',
    exemploResposta:
      'Imagine um cliente querendo cortar cabelo. O agente pergunta servico, dia, horario preferido e profissional. Depois confirma o agendamento e pode lembrar o cliente antes do horario.',
  },
  assistencia_tecnica: {
    nome: 'assistencia tecnica',
    palavrasChave: ['assistencia', 'tecnico', 'celular', 'notebook', 'computador', 'conserto', 'manutencao', 'aparelho'],
    doresComuns: [
      'cliente nao explica o defeito direito',
      'tecnico perde tempo perguntando o basico',
      'orcamento depende de triagem',
      'muitos chamados sem informacao suficiente',
    ],
    perguntasSimulacao: [
      'Qual aparelho?',
      'Qual defeito?',
      'Caiu ou molhou?',
      'Liga normalmente?',
      'Tem foto do problema?',
    ],
    beneficioPrincipal:
      'fazer triagem inicial, organizar informacoes do defeito e reduzir tempo perdido antes do tecnico avaliar.',
    exemploResposta:
      'Imagine um cliente com celular quebrado. O agente pergunta modelo, defeito, se caiu ou molhou, se liga e pede foto. O tecnico recebe a triagem pronta.',
  },
  igreja_eventos: {
    nome: 'igreja/eventos',
    palavrasChave: ['igreja', 'culto', 'evento', 'celula', 'ministerio', 'inscricao', 'oracao', 'retiro'],
    doresComuns: [
      'muitas perguntas sobre horarios',
      'inscricoes manuais',
      'pedidos de oracao dispersos',
      'informacoes repetitivas',
    ],
    perguntasSimulacao: [
      'Voce quer saber sobre culto, evento, inscricao ou pedido de oracao?',
      'Qual seu nome?',
      'Qual ministerio ou assunto?',
      'Deseja que alguem da lideranca retorne?',
    ],
    beneficioPrincipal:
      'organizar informacoes, inscricoes e pedidos recebidos pelo WhatsApp com encaminhamento para responsaveis.',
    exemploResposta:
      'Imagine alguem perguntando sobre um evento. O agente informa horario, coleta nome, confirma inscricao e encaminha casos que precisam de retorno humano.',
  },
};

module.exports = {
  nichos,
};
