const { Router } = require('express');

const notificationController = require('../controllers/notification.controller');

const router = Router();

router.get('/', notificationController.listNotifications);
router.get('/unread', notificationController.listUnreadNotifications);
router.patch('/:id/read', notificationController.markAsRead);
router.patch('/:id/resolve', notificationController.markAsResolved);

module.exports = router;
