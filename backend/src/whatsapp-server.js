require('dotenv').config();

const { startWhatsAppWebClient } = require('./channels/whatsapp-web/whatsapp-web.client');

console.log('[WhatsApp] Iniciando cliente local...');
console.log('[WhatsApp] Escaneie o QR Code com seu WhatsApp.');

startWhatsAppWebClient();
