import mongoose from 'mongoose';
import { config } from '../config/env.js';

const messageSchema = new mongoose.Schema({
  from: {
    type: String,
    required: true,
  },
  to: {
    type: String,
    required: true,
  },
  body: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ['in', 'out'],
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

let messageModel = null;
let connectionPromise = null;

async function getMessageModel() {
  if (messageModel) return messageModel;
  if (!config.mongoUri) {
    throw new Error('MONGO_URI is not configured; WhatsApp message persistence is unavailable.');
  }
  if (!connectionPromise) {
    connectionPromise = mongoose.connect(config.mongoUri).catch((err) => {
      connectionPromise = null;
      throw err;
    });
  }
  await connectionPromise;
  if (!mongoose.models.WhatsAppMessage) {
    mongoose.model('WhatsAppMessage', messageSchema);
  }
  messageModel = mongoose.models.WhatsAppMessage;
  return messageModel;
}

let replyModel = null;
let replyConnectionPromise = null;

async function getReplyModel() {
  if (replyModel) return replyModel;
  const MessageModel = await getMessageModel();
  if (!mongoose.models.WhatsAppReply) {
    const replySchema = new mongoose.Schema({
      messageId: { type: String, required: true, unique: true, index: true },
      replyText: { type: String, default: null },
      createdAt: { type: Date, default: Date.now },
    }, { timestamps: true });
    mongoose.model('WhatsAppReply', replySchema);
  }
  replyModel = mongoose.models.WhatsAppReply;
  return replyModel;
}

export async function hasReplySent(messageId) {
  const ReplyModel = await getReplyModel();
  const found = await ReplyModel.exists({ messageId: String(messageId) });
  return Boolean(found);
}

export async function markReplySent(messageId, replyText = null) {
  const ReplyModel = await getReplyModel();
  try {
    await ReplyModel.create({ messageId: String(messageId), replyText });
  } catch (err) {
    if (!(err && (err.code === 11000 || String(err.message || '').includes('duplicate key')))) {
      throw err;
    }
  }
}
export async function recordMessage(doc) {
  const MessageModel = await getMessageModel();
  return MessageModel.create(doc);
}

export async function listMessages(limit = 100) {
  const MessageModel = await getMessageModel();
  return MessageModel.find().sort({ createdAt: -1 }).limit(limit);
}

export async function closeMessageStore() {
  if (!connectionPromise) return;
  try {
    await mongoose.disconnect();
  } catch {
    // ignore best-effort disconnect failures
  } finally {
    connectionPromise = null;
    messageModel = null;
  }
}

export default {
  recordMessage,
  listMessages,
  closeMessageStore,
};

