const aiService = require('../services/ai.service');
const aiOrchestratorService = require('../services/ai-orchestrator.service');
const { inspectDataFiles } = require('../services/debug-file.service');

function handleOpenAIDebug(req, res) {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({
      erro: 'Rota nao encontrada',
    });
  }

  return res.json({
    openaiConfigured: aiService.isOpenAIConfigured(),
    model: aiService.getOpenAIModel(),
  });
}

async function handleOpenAIPing(req, res) {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({
      erro: 'Rota nao encontrada',
    });
  }

  const result = await aiService.pingOpenAI();
  return res.json(result);
}

function handleAIDebug(req, res) {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({
      erro: 'Rota nao encontrada',
    });
  }

  return res.json({
    aiProvider: aiOrchestratorService.getAIProvider(),
    openaiConfigured: aiService.isOpenAIConfigured(),
    openaiModel: aiService.getOpenAIModel(),
    nodeEnv: process.env.NODE_ENV || 'development',
  });
}

function handleRuntimeDebug(req, res) {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({
      erro: 'Rota nao encontrada',
    });
  }

  const memoryUsage = process.memoryUsage();

  return res.json({
    pid: process.pid,
    uptime: process.uptime(),
    nodeVersion: process.version,
    platform: process.platform,
    memory: {
      rss: memoryUsage.rss,
      heapUsed: memoryUsage.heapUsed,
    },
  });
}

async function handleFilesDebug(req, res, next) {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({
      erro: 'Rota nao encontrada',
    });
  }

  try {
    const result = await inspectDataFiles();
    return res.json(result);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  handleAIDebug,
  handleFilesDebug,
  handleOpenAIDebug,
  handleOpenAIPing,
  handleRuntimeDebug,
};
