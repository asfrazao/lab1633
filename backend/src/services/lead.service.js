const { randomUUID } = require('crypto');
const path = require('path');

const { readJsonArray, writeJsonArray } = require('../utils/jsonFile.util');
const { nowIso } = require('../utils/date.util');

const leadsFilePath = path.join(__dirname, '..', 'data', 'leads.json');

async function upsertFromConversation(conversation) {
  const leads = await readJsonArray(leadsFilePath);
  const index = leads.findIndex((lead) => lead.telefone === conversation.telefone);
  const timestamp = nowIso();
  const existingLead = index >= 0 ? leads[index] : null;

  const lead = {
    id: existingLead?.id || randomUUID(),
    telefone: conversation.telefone,
    nome: conversation.nome || existingLead?.nome || null,
    tipoNegocio: conversation.tipoNegocio || existingLead?.tipoNegocio || null,
    dorPrincipal: conversation.dorPrincipal || existingLead?.dorPrincipal || null,
    nivelInteresse: conversation.nivelInteresse || existingLead?.nivelInteresse || 'frio',
    profileId: conversation.profileId || existingLead?.profileId || null,
    clientName: conversation.clientName || existingLead?.clientName || null,
    aiProvider: conversation.aiProvider || existingLead?.aiProvider || null,
    resumo: buildResumo(conversation, existingLead),
    status: existingLead?.status || 'novo',
    createdAt: existingLead?.createdAt || timestamp,
    updatedAt: timestamp,
  };

  if (index >= 0) {
    leads[index] = lead;
  } else {
    leads.push(lead);
  }

  await writeJsonArray(leadsFilePath, leads);

  return lead;
}

function buildResumo(conversation, existingLead) {
  if (conversation.tipoNegocio) {
    const genericBusiness = !isKnownBusiness(conversation.tipoNegocio);

    if (genericBusiness) {
      return buildGenericBusinessResumo(conversation);
    }

    const parts = [];
    const business = formatBusinessForResumo(conversation.tipoNegocio);
    parts.push(`Cliente${conversation.nome ? ` ${conversation.nome}` : ''} informou ter ${business}`);

    if (conversation.dorPrincipal) {
      parts.push(`relatou dificuldade ${formatPainForResumo(conversation.dorPrincipal)}`);
    }

    if (conversation.nivelInteresse === 'quente') {
      parts.push('demonstrou interesse em contratar ou testar um agente de IA');
    } else if (conversation.nivelInteresse === 'morno') {
      parts.push('demonstrou interesse em melhorar o atendimento pelo WhatsApp');
    } else {
      parts.push('iniciou conversa sobre agentes de IA para WhatsApp');
    }

    return `${parts.join(', ')}.`;
  }

  return existingLead?.resumo || 'Cliente iniciou contato com o Agente Comercial Lab1633.';
}

function buildGenericBusinessResumo(conversation) {
  const parts = [];
  const business = formatBusinessForResumo(conversation.tipoNegocio);

  if (conversation.nivelInteresse === 'quente') {
    if (isSalesOrOpportunityPain(conversation.dorPrincipal)) {
      return `Cliente${conversation.nome ? ` ${conversation.nome}` : ''} informou trabalhar com ${business}, relatou interesse em vender mais ou organizar atendimentos pelo WhatsApp e confirmou interesse em testar ou contratar um agente de IA. Atendimento encaminhado para Alessandro.`;
    }

    if (conversation.dorPrincipal) {
      return `Cliente${conversation.nome ? ` ${conversation.nome}` : ''} informou trabalhar com ${business}, relatou dificuldade ${formatPainForResumo(conversation.dorPrincipal)} e confirmou interesse em testar ou contratar um agente de IA. Atendimento encaminhado para Alessandro.`;
    }

    return `Cliente${conversation.nome ? ` ${conversation.nome}` : ''} informou trabalhar com ${business} e confirmou interesse em testar ou contratar um agente de IA. Atendimento encaminhado para Alessandro.`;
  }

  parts.push(`Cliente${conversation.nome ? ` ${conversation.nome}` : ''} informou trabalhar com ${business}`);

  if (conversation.dorPrincipal) {
    parts.push(`relatou dificuldade ${formatPainForResumo(conversation.dorPrincipal)}`);
  }

  if (conversation.nivelInteresse === 'quente') {
    parts.push('demonstrou interesse em contratar ou testar um agente de IA');
  } else {
    parts.push('demonstrou interesse em organizar atendimentos e oportunidades pelo WhatsApp');
  }

  return `${parts.join(' e ')}.`;
}

function formatBusinessForResumo(tipoNegocio) {
  const labels = {
    doceria: 'uma doceria',
    marmitaria: 'uma marmitaria',
    barbearia: 'uma barbearia',
    assistencia_tecnica: 'uma assistencia tecnica',
    igreja_eventos: 'uma igreja ou operacao de eventos',
  };

  return labels[tipoNegocio] || tipoNegocio;
}

function isKnownBusiness(tipoNegocio) {
  return ['doceria', 'marmitaria', 'barbearia', 'assistencia_tecnica', 'igreja_eventos'].includes(tipoNegocio);
}

function formatPainForResumo(dorPrincipal) {
  const normalizedPain = String(dorPrincipal).toLowerCase();

  if (normalizedPain.includes('orcamento') || normalizedPain.includes('pedido')) {
    return 'em responder orcamentos ou pedidos pelo WhatsApp';
  }

  if (normalizedPain.includes('agendamento')) {
    return 'em organizar agendamentos pelo WhatsApp';
  }

  if (normalizedPain.includes('triagem')) {
    return 'em fazer triagem inicial dos clientes';
  }

  if (normalizedPain.includes('demora')) {
    return 'com demora para responder clientes';
  }

  return `com ${dorPrincipal}`;
}

function isSalesOrOpportunityPain(dorPrincipal) {
  const normalizedPain = String(dorPrincipal || '').toLowerCase();
  return normalizedPain.includes('vender') || normalizedPain.includes('venda') || normalizedPain.includes('oportunidade');
}

module.exports = {
  upsertFromConversation,
};
