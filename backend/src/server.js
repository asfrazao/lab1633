require('dotenv').config();

process.on('uncaughtException', (error) => {
  console.error('[Process] uncaughtException:', {
    message: error?.message,
    stack: error?.stack,
  });
});

process.on('unhandledRejection', (reason) => {
  console.error('[Process] unhandledRejection:', {
    reasonMessage: reason?.message,
    reasonStack: reason?.stack,
    reason,
  });
});

process.on('exit', (code) => {
  console.error('[Process] exit:', { code });
});

process.on('beforeExit', (code) => {
  console.warn('[Process] beforeExit:', { code });
});

const app = require('./app');

const port = process.env.PORT || 3000;
const appName = process.env.APP_NAME || 'Lab1633';

app.listen(port, () => {
  console.log(`[Server] ${appName} Backend rodando na porta ${port}`);
  console.log(`[Server] PID: ${process.pid}`);
});
