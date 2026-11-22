import mongoose from 'mongoose';
import Order from '../models/Order.js';
import Payment from '../models/Payment.js';
import { logEvent } from './loggingService.js';

const isTransactionUnsupportedError = (err) => {
  const msg = String(err?.message || err);
  return /Transaction numbers are only allowed on a replica set member or mongos/i.test(msg)
    || /Transactions are not supported/i.test(msg)
    || /This MongoDB deployment does not support retryable writes/i.test(msg);
};

export const runOptionalTransaction = async (task) => {
  let session = null;
  try {
    session = await mongoose.startSession();
  } catch (_e) {
    return task(null);
  }

  let result;
  let fallback = false;
  try {
    await session.withTransaction(async () => {
      result = await task(session);
    });
  } catch (err) {
    if (isTransactionUnsupportedError(err)) {
      fallback = true;
    } else {
      throw err;
    }
  } finally {
    try { session.endSession(); } catch (_e) {}
  }

  if (fallback) {
    return task(null);
  }
  return result;
};

export const calculatePricing = (clipCount) => {
  const count = parseInt(clipCount, 10);
  if (isNaN(count) || count <= 0) return 0;
  if (count === 1) return 1099;
  if (count >= 2 && count <= 4) return count * 899;
  if (count === 5) return 3995;
  return count * 699;
};

export const createPaymentRecord = async (paymentData, options = {}) => {
  const runner = async (session) => {
    const payment = new Payment(paymentData);
    await payment.save({ session });
    return payment;
  };
  if (options.session) return runner(options.session);
  return runOptionalTransaction(runner);
};

export const markPaymentCaptured = async (razorpayPaymentId, data = {}, options = {}) => {
  const runner = async (session) => {
    const payment = await Payment.findOne({ razorpayPaymentId }).session(session || null);
    if (!payment) return null;
    payment.status = 'captured';
    if (data.orderId) payment.orderId = data.orderId;
    if (data.razorpaySignature) payment.razorpaySignature = data.razorpaySignature;
    if (data.amount !== undefined) payment.amount = data.amount;
    if (data.clientName) payment.clientName = data.clientName;
    if (data.contact) payment.contact = data.contact;
    if (data.log) payment.logs.push({ message: data.log });
    await payment.save({ session });
    return payment;
  };
  if (options.session) return runner(options.session);
  return runOptionalTransaction(runner);
};

export const markPaymentFailed = async (razorpayPaymentId, reason = '', options = {}) => {
  const runner = async (session) => {
    const payment = await Payment.findOne({ razorpayPaymentId }).session(session || null);
    if (!payment) {
      await Payment.findOneAndUpdate({ razorpayPaymentId }, { status: 'failed' }, { session });
      return null;
    }
    if (payment.status !== 'captured') {
      payment.status = 'failed';
      if (reason) payment.logs.push({ message: `Payment failed: ${reason}` });
      await payment.save({ session });
    }
    return payment;
  };
  if (options.session) return runner(options.session);
  return runOptionalTransaction(runner);
};

export const refundPayment = async (razorpayPaymentId, options = {}) => {
  const runner = async (session) => {
    let payment = await Payment.findOne({ razorpayPaymentId }).session(session || null);
    if (!payment) return null;
    if (payment.status !== 'refunded') {
      payment.status = 'refunded';
      await payment.save({ session });
    }
    if (payment.orderId) {
      await Order.findOneAndUpdate(
        { orderId: payment.orderId },
        { paymentStatus: 'refunded' },
        { session }
      );
    }
    return payment;
  };
  if (options.session) return runner(options.session);
  return runOptionalTransaction(runner);
};

export const processWebhookEvent = async ({ event, paymentEntity }, options = {}) => {
  const razorpayPaymentId = paymentEntity?.id;
  const razorpayOrderId = paymentEntity?.order_id;

  const runner = async (session) => {
    const existingPayment = razorpayPaymentId
      ? await Payment.findOne({ razorpayPaymentId }).session(session || null)
      : null;

    if (existingPayment) {
      if (event === 'payment.captured' && existingPayment.status === 'captured') {
        return { status: 'ok', message: 'Already processed' };
      }
      if (event === 'payment.refunded' && existingPayment.status === 'refunded') {
        return { status: 'ok', message: 'Already refunded' };
      }
      if (event === 'payment.failed' && existingPayment.status === 'failed') {
        return { status: 'ok', message: 'Already marked failed' };
      }
    }

    switch (event) {
      case 'payment.captured':
        break;
      case 'payment.failed':
        if (!existingPayment || existingPayment.status !== 'captured') {
          await Payment.findOneAndUpdate(
            { razorpayPaymentId },
            { status: 'failed' },
            { session }
          );
        }
        await logEvent({
          action: 'PAYMENT_FAILURE',
          details: { razorpayPaymentId, razorpayOrderId, error: paymentEntity?.error_description }
        });
        break;
      case 'payment.refunded':
        if (!existingPayment || existingPayment.status !== 'refunded') {
          await Payment.findOneAndUpdate(
            { razorpayPaymentId },
            { status: 'refunded' },
            { session }
          );
          const refundedPayment = await Payment.findOne({ razorpayPaymentId }).session(session || null);
          if (refundedPayment?.orderId) {
            await Order.findOneAndUpdate(
              { orderId: refundedPayment.orderId },
              { paymentStatus: 'refunded' },
              { session }
            );
          }
        }
        await logEvent({
          action: 'PAYMENT_REFUND',
          details: { razorpayPaymentId, razorpayOrderId }
        });
        break;
      default:
        break;
    }

    return { status: 'ok' };
  };

  if (options.session) return runner(options.session);
  return runOptionalTransaction(runner);
};

export const getOrderFinancialSummary = async (orderId) => {
  const [order, payment] = await Promise.all([
    Order.findOne({ orderId }).lean(),
    Payment.findOne({ orderId }).lean()
  ]);
  return { order, payment };
};

export const financeService = {
  runOptionalTransaction,
  calculatePricing,
  createPaymentRecord,
  markPaymentCaptured,
  markPaymentFailed,
  refundPayment,
  processWebhookEvent,
  getOrderFinancialSummary
};

export default financeService;
