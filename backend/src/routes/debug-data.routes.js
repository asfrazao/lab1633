const { Router } = require('express');

const debugDataController = require('../controllers/debug-data.controller');

const router = Router();

router.delete('/leads', debugDataController.resetLeads);
router.delete('/conversations', debugDataController.resetConversations);
router.delete('/notifications', debugDataController.resetNotifications);
router.delete('/all', debugDataController.resetAllData);

module.exports = router;
