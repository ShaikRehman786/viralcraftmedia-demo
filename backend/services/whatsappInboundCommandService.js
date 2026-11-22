import crypto from 'crypto';
import User from '../models/User.js';
import WhatsAppInboundCommand from '../models/WhatsAppInboundCommand.js';

function normalizePhone(phone) {
  if (!phone) return '';
  let clean = String(phone).split('@')[0].split(':')[0].replace(/\D/g, '');
  if (clean.length === 10 && !clean.startsWith('91')) clean = '91' + clean;
  if (clean.length === 14 && clean.startsWith('9191')) clean = clean.slice(2);
  if (clean.length === 11 && clean.startsWith('0')) clean = '91' + clean.slice(1);
  return clean;
}

function classifyCommand(text) {
  const upper = String(text || '').replace(/[*_~]/g, '').trim().toUpperCase();
  if (upper.startsWith('NEW PROJECT')) return 'NEW_PROJECT';
  const first = upper.split(/\s+/)[0];
  if (['HELP', 'STATUS', 'PROJECTS', 'TASKS'].includes(first)) return first;
  if (['ACCEPT', 'DECLINE', 'START', 'PAUSE', 'RESUME', 'DONE'].includes(first)) return first;
  return 'UNKNOWN';
}

export async function resolveSender(commandContext) {
  const sender = (commandContext && commandContext.sender) || {};
  const text = String((commandContext && commandContext.text) || (commandContext && commandContext.body) || '').trim();
  const senderPhoneRaw = sender.senderPhone || sender.phone || sender.waId || commandContext.senderPhone || '';
  const cleanSender = normalizePhone(senderPhoneRaw);
  // Sender identity is resolved authoritatively from persisted active users.
  // Client-supplied self-origin flags are never trusted for command execution.
  const fromMe = Boolean(sender.fromMe);
  if (fromMe || Boolean(sender.isFromSelf)) {
    return { user: null, isAdmin: false, isEmployee: false, cleanSender, isFromSelf: false };
  }
  const isFromSelf = false;

  let user = await User.findOne({ status: { $regex: /^active$/i }, phone: cleanSender });
  if (!user && senderPhoneRaw && senderPhoneRaw !== cleanSender) {
    user = await User.findOne({ status: { $regex: /^active$/i }, phone: senderPhoneRaw });
  }
  if (!user && cleanSender) {
    user = await User.findOne({ status: { $regex: /^active$/i }, phone: new RegExp(cleanSender.slice(-10) + '$') });
  }

  if (user && user.role === 'SUPER_ADMIN') {
    return { user, isAdmin: true, isEmployee: false, cleanSender, isFromSelf };
  }
  if (user && user.role === 'EMPLOYEE') {
    return { user, isAdmin: false, isEmployee: true, cleanSender, isFromSelf };
  }
  return { user: null, isAdmin: false, isEmployee: false, cleanSender, isFromSelf };
}

export async function processInboundWhatsAppCommand(input = {}) {
  const { handleAdminCommand, handleEmployeeCommand } = await import('./whatsappCommandProcessor.js');
  const commandContext = (input && input.commandContext) || input || {};
  const sender = (commandContext && commandContext.sender) || {};
  // Never execute CRM commands for outbound/self-originated WhatsApp messages.
  // Client-supplied sender identity is never trusted for authorization.
  if (Boolean(sender.fromMe) || Boolean(sender.isFromSelf)) {
    return {
      success: true,
      handled: false,
      command: 'IGNORED',
      ignored: true,
      fromMe: true,
      replyText: null,
    };
  }
  const text = String(commandContext.text || commandContext.body || '').trim();
  const idempotencyKey = input.idempotencyKey || commandContext.idempotencyKey || commandContext.idempotency_key;
  const messageId = String(
    commandContext.messageId ||
      commandContext.message_id ||
      commandContext.id ||
      idempotencyKey ||
      `${normalizePhone((commandContext.sender || {}).senderPhone || commandContext.senderPhone)}:${text}:${commandContext.receivedAt || ''}`,
  ).trim() || crypto.randomUUID();

  const command = classifyCommand(text);

  let record = null;
  try {
    record = await WhatsAppInboundCommand.create({
      messageId,
      idempotencyKey: idempotencyKey || null,
      senderPhone: normalizePhone((commandContext.sender || {}).senderPhone || commandContext.senderPhone),
      command,
      status: 'processing',
    });
  } catch (err) {
    if (err && (err.code === 11000 || String(err.message || '').includes('duplicate key'))) {
      record = await WhatsAppInboundCommand.findOne({ messageId });
      if (record && record.status === 'completed') {
        const stored = record.result && typeof record.result === 'object' ? record.result : {};
        return { success: true, ...stored, duplicate: true, messageId };
      }
      if (record && record.status === 'failed') {
        // Terminal failure: never repeat business operations on retry.
        return { success: false, duplicate: true, failed: true, command: record.command, replyText: record.replyText, messageId };
      }
      if (record && record.status === 'processing') {
        const ageMs = Date.now() - new Date(record.updatedAt || record.createdAt || 0).getTime();
        if (!Number.isFinite(ageMs) || ageMs < 30000) {
          return { success: true, duplicate: true, processing: true, command: record.command, replyText: record.replyText, messageId };
        }
        // Stuck record recovery: only proceed if we win the atomic transition.
        const recovery = await WhatsAppInboundCommand.updateOne(
          { _id: record._id, status: 'processing', updatedAt: { $lte: new Date(Date.now() - 30000) } },
          { $set: { status: 'processing', updatedAt: new Date() } },
        );
        if (!recovery || !recovery.modifiedCount) {
          return { success: true, duplicate: true, processing: true, command: record.command, replyText: record.replyText, messageId };
        }
      }
      if (record && record.status !== 'processing') {
        await WhatsAppInboundCommand.updateOne({ _id: record._id }, { $set: { status: 'processing', updatedAt: new Date() } });
      }
    } else {
      throw err;
    }
  }

  const { user, isAdmin, isEmployee, cleanSender, isFromSelf } = await resolveSender(commandContext);

  const replies = [];
  const mockMsg = {
    from: `${cleanSender}@c.us`,
    to: 'system@c.us',
    body: text,
    reply: async (msgText) => {
      replies.push(String(msgText));
    },
  };

  try {
    if (user && (isAdmin || isFromSelf)) {
      await handleAdminCommand(user, text, mockMsg, cleanSender);
    } else if (user && isEmployee) {
      await handleEmployeeCommand(user, text, mockMsg, cleanSender);
    }
  } catch (err) {
    await WhatsAppInboundCommand.updateOne({ messageId }, { $set: { status: 'failed', replyText: replies.join('\n') || null } });
    throw err;
  }

  const replyText = replies.length ? replies.join('\n') : null;
  const handled = Boolean(user);
  const result = {
    success: true,
    handled,
    command,
    replyText,
    audit: { logged: handled },
    duplicate: false,
  };

  await WhatsAppInboundCommand.updateOne(
    { messageId },
    { $set: { status: 'completed', command, replyText, result } },
  );

  return { ...result, messageId };
}

export default {
  processInboundWhatsAppCommand,
  normalizePhone,
  classifyCommand,
};






