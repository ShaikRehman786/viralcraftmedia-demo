import mongoose from 'mongoose';

const whatsappMessageSchema = new mongoose.Schema({
  from: {
    type: String,
    required: true
  },
  to: {
    type: String,
    required: true
  },
  body: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['in', 'out'],
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

const WhatsAppMessage = mongoose.model('WhatsAppMessage', whatsappMessageSchema);
export default WhatsAppMessage;
