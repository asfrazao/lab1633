const notificationService = require('../services/notification.service');

async function listNotifications(req, res, next) {
  try {
    const items = await notificationService.listNotifications();
    return res.json({ items });
  } catch (error) {
    return next(error);
  }
}

async function listUnreadNotifications(req, res, next) {
  try {
    const items = await notificationService.listUnreadNotifications();
    return res.json({ items });
  } catch (error) {
    return next(error);
  }
}

async function markAsRead(req, res, next) {
  try {
    const item = await notificationService.markAsRead(req.params.id);

    if (!item) {
      return res.status(404).json({
        error: 'Notificacao nao encontrada.',
      });
    }

    return res.json({
      success: true,
      item,
    });
  } catch (error) {
    return next(error);
  }
}

async function markAsResolved(req, res, next) {
  try {
    const item = await notificationService.markAsResolved(req.params.id);

    if (!item) {
      return res.status(404).json({
        error: 'Notificacao nao encontrada.',
      });
    }

    return res.json({
      success: true,
      item,
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  listNotifications,
  listUnreadNotifications,
  markAsRead,
  markAsResolved,
};
