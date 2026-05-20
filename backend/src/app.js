require('dotenv').config();

const express = require('express');
const cors = require('cors');

const healthRoutes = require('./routes/health.routes');
const chatRoutes = require('./routes/chat.routes');
const debugRoutes = require('./routes/debug.routes');
const debugDataRoutes = require('./routes/debug-data.routes');
const notificationRoutes = require('./routes/notification.routes');
const clientProfileRoutes = require('./routes/client-profile.routes');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/health', healthRoutes);
app.use('/chat-teste', chatRoutes);
app.use('/debug', debugRoutes);
app.use('/debug/data', debugDataRoutes);
app.use('/notifications', notificationRoutes);
app.use('/client-profiles', clientProfileRoutes);

app.use((req, res) => {
  res.status(404).json({
    erro: 'Rota nao encontrada',
  });
});

app.use((error, req, res, next) => {
  console.error('[Express] Erro nao tratado:', {
    method: req.method,
    path: req.path,
    message: error.message,
    stack: error.stack,
  });

  res.status(500).json({
    error: 'Erro interno no servidor.',
  });
});

module.exports = app;
