const { Router } = require('express');

const chatController = require('../controllers/chat.controller');

const router = Router();

router.post('/', chatController.handleChatTeste);

module.exports = router;
