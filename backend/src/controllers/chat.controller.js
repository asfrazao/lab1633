const chatFlowService = require('../services/chat-flow.service');

async function handleChatTeste(req, res, next) {
  try {
    const { from, message } = req.body || {};
    const result = await chatFlowService.processIncomingMessage({ from, message });

    return res.json(result);
  } catch (error) {
    if (error.statusCode === 400) {
      return res.status(400).json({
        erro: error.message,
      });
    }

    console.error('[ChatController] Erro em /chat-teste:', {
      message: error.message,
      stack: error.stack,
    });

    return res.status(500).json({
      error: 'Erro interno no servidor.',
    });
  }
}

module.exports = {
  handleChatTeste,
};
