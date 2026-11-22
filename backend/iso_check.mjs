import connectDB from './config/db.js';
await connectDB();
const { processInboundWhatsAppCommand } = await import('./services/whatsappInboundCommandService.js');
const res = await processInboundWhatsAppCommand({ commandContext: { text: 'STATUS', sender: { senderPhone: '919440720814' }, messageId: 'wamid.iso5' }, idempotencyKey: 'wamid.iso5' });
console.log('RESULT_HANDLED=' + res.handled);
console.log('WA_WEB_LOADED=' + process.moduleLoadList.some(m => m.includes('whatsapp-web.js')));
