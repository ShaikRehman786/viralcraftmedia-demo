import mongoose from 'mongoose';

const whatsappSessionSchema = new mongoose.Schema({
  connected: {
    type: Boolean,
    default: false
  },
  lastConnectedAt: {
    type: Date
  },
  qrCode: {
    type: String
  },
  phoneNumber: {
    type: String
  },
  pushName: {
    type: String
  }
}, {
  timestamps: true
});

const WhatsAppSession = mongoose.model('WhatsAppSession', whatsappSessionSchema);
export default WhatsAppSession;
