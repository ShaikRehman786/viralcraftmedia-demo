import mongoose from 'mongoose';

const whatsAppInboundCommandSchema = new mongoose.Schema({
  messageId: { type: String, required: true, unique: true, index: true },
  idempotencyKey: { type: String, index: true },
  senderPhone: { type: String, default: '' },
  command: { type: String, default: 'UNKNOWN' },
  replyText: { type: String, default: null },
  status: { type: String, enum: ['processing', 'completed', 'failed'], default: 'processing' },
  result: { type: mongoose.Schema.Types.Mixed, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}, { timestamps: true });

export default mongoose.model('WhatsAppInboundCommand', whatsAppInboundCommandSchema);
