const { Router } = require('express');

const clientProfileController = require('../controllers/client-profile.controller');

const router = Router();

router.get('/', clientProfileController.handleListClientProfiles);
router.get('/:phone', clientProfileController.handleGetClientProfile);
router.patch('/:phone/provider', clientProfileController.handleUpdateClientProfileProvider);

module.exports = router;
