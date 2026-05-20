const { Router } = require('express');

const clientProfileController = require('../controllers/client-profile.controller');

const router = Router();

router.get('/', clientProfileController.handleListClientProfiles);
router.post('/', clientProfileController.handleCreateClientProfile);
router.patch('/:phone/provider', clientProfileController.handleUpdateClientProfileProvider);
router.patch('/:phone/status', clientProfileController.handleUpdateClientProfileStatus);
router.get('/:phone', clientProfileController.handleGetClientProfile);
router.put('/:phone', clientProfileController.handleUpdateClientProfile);
router.delete('/:phone', clientProfileController.handleDeleteClientProfile);

module.exports = router;
