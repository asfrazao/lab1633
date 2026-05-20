const qrcode = require('qrcode-terminal');
const { Client, LocalAuth } = require('whatsapp-web.js');

const chatFlowService = require('../../services/chat-flow.service');
const aiService = require('../../services/ai.service');
const clientProfileService = require('../../services/client-profile.service');

const DEFAULT_TRIGGER = '#lab1633';
const EMPTY_TRIGGER_RESPONSE = 'Oi, eu sou o Agente Comercial da Lab1633. Me diga qual e o seu tipo de negocio.';
const ERROR_RESPONSE = 'Tive uma instabilidade aqui no teste. Pode tentar novamente em alguns segundos?';
const MESSAGE_DEDUP_TTL_MS = 5 * 60 * 1000;
const FINALIZED_REPLY_TTL_MS = 10 * 60 * 1000;
const processedMessageIds = new Map();
const finalizedConversationReplies = new Map();

function startWhatsAppWebClient() {
  const triggerConfig = getTriggerConfig();

  if (!triggerConfig.requireTrigger) {
    console.log(
      `[WhatsApp] Prefixo obrigatorio desativado. O bot respondera mensagens privadas sem ${triggerConfig.trigger}.`
    );
  }

  const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    },
  });

  client.on('qr', (qr) => {
    console.log('[WhatsApp] Escaneie o QR Code com seu WhatsApp.');
    qrcode.generate(qr, { small: true });
  });

  client.on('ready', () => {
    console.log('[WhatsApp] Cliente pronto.');
    console.log(`[WhatsApp] Envie uma mensagem comecando com ${triggerConfig.trigger} para testar.`);
  });

  client.on('authenticated', () => {
    console.log('[WhatsApp] Sessao autenticada localmente.');
  });

  client.on('auth_failure', (message) => {
    console.error('[WhatsApp] Falha de autenticacao:', message);
  });

  client.on('disconnected', (reason) => {
    console.warn('[WhatsApp] Cliente desconectado:', reason);
  });

  client.on('message', async (message) => {
    await handleIncomingWhatsAppMessage(message);
  });

  client.initialize();

  return client;
}

async function handleIncomingWhatsAppMessage(whatsAppMessage) {
  try {
    const messageId = getMessageId(whatsAppMessage);

    console.log('[WhatsApp] Mensagem recebida', {
      id: messageId,
      from: whatsAppMessage.from,
      fromMe: whatsAppMessage.fromMe,
      hasMedia: whatsAppMessage.hasMedia,
      body: whatsAppMessage.body,
    });

    if (wasMessageProcessed(messageId)) {
      console.log('[WhatsApp] Mensagem duplicada ignorada.');
      return;
    }

    if (whatsAppMessage.fromMe) {
      return;
    }

    if (whatsAppMessage.from && whatsAppMessage.from.endsWith('@g.us')) {
      return;
    }

    if (whatsAppMessage.hasMedia || whatsAppMessage.type !== 'chat') {
      return;
    }

    const rawBody = typeof whatsAppMessage.body === 'string' ? whatsAppMessage.body : '';
    const adminCommand = normalizeAdminCommand(rawBody);

    if (adminCommand) {
      await handleAdminCommand({
        command: adminCommand,
        from: whatsAppMessage.from,
        reply: (text) => whatsAppMessage.reply(text),
      });
      return;
    }

    const normalized = normalizeIncomingWhatsappMessage(rawBody);

    console.log('[WhatsApp] Mensagem normalizada', {
      shouldProcess: normalized.shouldProcess,
      reason: normalized.reason,
      normalizedMessage: normalized.message,
    });

    if (!normalized.shouldProcess) {
      if (normalized.reason === 'missing_trigger' && isDevelopment()) {
        console.log('[WhatsApp] Mensagem ignorada: prefixo obrigatorio ausente.');
      }
      return;
    }

    if (normalized.reason === 'empty_after_trigger') {
      await whatsAppMessage.reply(EMPTY_TRIGGER_RESPONSE);
      return;
    }

    const result = await chatFlowService.processIncomingMessage({
      from: whatsAppMessage.from,
      message: normalized.message,
    });

    if (shouldSuppressFinalizedReply(whatsAppMessage.from, result)) {
      console.log('[WhatsApp] Mensagem pos-finalizacao ignorada temporariamente.');
      return;
    }

    await whatsAppMessage.reply(result.resposta);
  } catch (error) {
    console.error('[WhatsApp] Erro ao processar mensagem:', {
      message: error.message,
      stack: error.stack,
    });

    try {
      await whatsAppMessage.reply(ERROR_RESPONSE);
    } catch (replyError) {
      console.error('[WhatsApp] Falha ao enviar resposta de erro:', replyError.message);
    }
  }
}

async function handleAdminCommand({ command, from, reply }) {
  const telefone = clientProfileService.normalizePhone(from);

  if (command === '#mock') {
    await clientProfileService.updateClientProfileProvider(telefone, 'mock');
    await reply('Modo mock ativado para este número. As próximas respostas não usarão a API da OpenAI.');
    return;
  }

  if (command === '#openai') {
    if (!aiService.isOpenAIConfigured()) {
      await reply('Não encontrei OPENAI_API_KEY configurada. O modo OpenAI não foi ativado.');
      return;
    }

    await clientProfileService.updateClientProfileProvider(telefone, 'openai');
    await reply('Modo OpenAI ativado para este número. As próximas respostas usarão a API real da OpenAI e podem gerar custo.');
    return;
  }

  if (command === '#auto') {
    await clientProfileService.updateClientProfileProvider(telefone, 'auto');
    await reply('Modo automático ativado para este número. Vou tentar OpenAI quando possível e usar fallback se falhar.');
    return;
  }

  const profile = await clientProfileService.getOrCreateClientProfileByPhone(telefone);
  const lines = [
    `Perfil: ${profile.nomeCliente}`,
    `Tipo de negócio: ${profile.tipoNegocio}`,
  ];

  if (command === '#perfil' && profile.descricao) {
    lines.push(`Descrição: ${profile.descricao}`);
  }

  lines.push(`Modo de IA: ${profile.aiProvider}`);

  await reply(lines.join('\n'));
}

function normalizeAdminCommand(rawMessage) {
  const text = String(rawMessage || '').trim().toLowerCase();
  return ['#mock', '#openai', '#auto', '#status', '#perfil'].includes(text) ? text : null;
}

function shouldSuppressFinalizedReply(from, result) {
  if (result?.estado !== 'finalizado' || result?.acao !== 'finalizar') {
    return false;
  }

  const now = Date.now();

  for (const [contact, timestamp] of finalizedConversationReplies.entries()) {
    if (now - timestamp > FINALIZED_REPLY_TTL_MS) {
      finalizedConversationReplies.delete(contact);
    }
  }

  const lastReplyAt = finalizedConversationReplies.get(from);

  if (lastReplyAt && now - lastReplyAt <= FINALIZED_REPLY_TTL_MS) {
    return true;
  }

  finalizedConversationReplies.set(from, now);
  return false;
}

function getMessageId(whatsAppMessage) {
  return whatsAppMessage?.id?._serialized || whatsAppMessage?.id?.id || null;
}

function wasMessageProcessed(messageId) {
  if (!messageId) {
    return false;
  }

  const now = Date.now();

  for (const [id, timestamp] of processedMessageIds.entries()) {
    if (now - timestamp > MESSAGE_DEDUP_TTL_MS) {
      processedMessageIds.delete(id);
    }
  }

  if (processedMessageIds.has(messageId)) {
    return true;
  }

  processedMessageIds.set(messageId, now);
  return false;
}

function normalizeIncomingWhatsappMessage(rawMessage) {
  const { trigger, requireTrigger } = getTriggerConfig();
  const text = String(rawMessage || '').trim();

  if (!text) {
    return {
      shouldProcess: false,
      message: null,
      reason: 'empty_message',
    };
  }

  const startsWithTrigger = text.toLowerCase().startsWith(trigger.toLowerCase());

  if (requireTrigger && !startsWithTrigger) {
    return {
      shouldProcess: false,
      message: null,
      reason: 'missing_trigger',
    };
  }

  const normalizedMessage = startsWithTrigger ? text.slice(trigger.length).trim() : text;

  if (!normalizedMessage) {
    return {
      shouldProcess: true,
      message: null,
      reason: 'empty_after_trigger',
    };
  }

  return {
    shouldProcess: true,
    message: normalizedMessage,
    reason: 'ok',
  };
}

function getTriggerConfig() {
  const trigger = String(process.env.WHATSAPP_TRIGGER || DEFAULT_TRIGGER).trim() || DEFAULT_TRIGGER;
  const requireTrigger = String(process.env.WHATSAPP_REQUIRE_TRIGGER || 'true').trim().toLowerCase() === 'true';

  return {
    trigger,
    requireTrigger,
  };
}

function isDevelopment() {
  return String(process.env.NODE_ENV || 'development').toLowerCase() === 'development';
}

module.exports = {
  wasMessageProcessed,
  shouldSuppressFinalizedReply,
  normalizeIncomingWhatsappMessage,
  normalizeAdminCommand,
  startWhatsAppWebClient,
};
