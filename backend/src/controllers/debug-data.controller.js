const debugDataService = require('../services/debug-data.service');

async function resetLeads(req, res) {
  return runDebugReset(res, () => debugDataService.resetLeads());
}

async function resetConversations(req, res) {
  return runDebugReset(res, () => debugDataService.resetConversations());
}

async function resetNotifications(req, res) {
  return runDebugReset(res, () => debugDataService.resetNotifications());
}

async function resetAllData(req, res) {
  return runDebugReset(res, () => debugDataService.resetAllData());
}

async function runDebugReset(res, resetFn) {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({
      error: 'Operacao de debug bloqueada em producao.',
    });
  }

  try {
    const result = await resetFn();
    return res.json(result);
  } catch (error) {
    console.error('[DebugData] Falha ao resetar dados locais:', {
      message: error.message,
      stack: error.stack,
    });

    return res.status(500).json({
      error: 'Erro ao resetar dados locais.',
    });
  }
}

module.exports = {
  resetAllData,
  resetConversations,
  resetLeads,
  resetNotifications,
};
