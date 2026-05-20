const { Router } = require('express');

const debugController = require('../controllers/debug.controller');

const router = Router();

router.get('/ai', debugController.handleAIDebug);
router.get('/files', debugController.handleFilesDebug);
router.get('/runtime', debugController.handleRuntimeDebug);
router.get('/openai', debugController.handleOpenAIDebug);
router.get('/openai/ping', debugController.handleOpenAIPing);
router.get('/profile/:phone', debugController.handleProfileDebug);

module.exports = router;
