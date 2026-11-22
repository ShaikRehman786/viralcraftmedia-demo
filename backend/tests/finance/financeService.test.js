import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';

process.env.NODE_ENV = 'test';
process.env.INTERNAL_SERVICE_KEY = 'test-internal-secret-key-0123456789';
process.env.RAZORPAY_KEY_ID = 'rzp_test_placeholder';
process.env.RAZORPAY_KEY_SECRET = 'placeholder';
process.env.RAZORPAY_WEBHOOK_SECRET = 'test-webhook-secret';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
process.env.FRONTEND_URL = 'http://localhost:5173';
process.env.MONGO_URI = process.env.MONGO_URI_TEST_FINANCE || 'mongodb://127.0.0.1:27017/finance_domain_test';
process.env.BACKUP_MONGODB_URI = '';
process.env.BACKUP_JWT_SECRET = 'test-backup-secret';
process.env.PARTNER_JWT_SECRET = 'test-partner-secret';
process.env.BACKUP_ADMIN_EMAIL = 'backup-admin@example.com';
process.env.BACKUP_ADMIN_PASSWORD = 'test-backup-password';
delete process.env.REDIS_URL;

const connectDB = (await import('../../config/db.js')).default;
await connectDB();

const Payment = (await import('../../models/Payment.js')).default;
const Order = (await import('../../models/Order.js')).default;
const financeService = (await import('../../services/financeService.js')).default;

async function resetDb() {
  await Promise.all([
    Payment.deleteMany({}),
    Order.deleteMany({})
  ]);
}

test.beforeEach(async () => {
  await resetDb();
});

test.after(async () => {
  await mongoose.connection.close();
});

test('financeService.calculatePricing returns expected tiers', () => {
  assert.equal(financeService.calculatePricing(1), 1099);
  assert.equal(financeService.calculatePricing(2), 1798);
  assert.equal(financeService.calculatePricing(5), 3995);
  assert.equal(financeService.calculatePricing(6), 4194);
  assert.equal(financeService.calculatePricing(0), 0);
});

test('financeService.createPaymentRecord creates payment', async () => {
  const payment = await financeService.createPaymentRecord({
    razorpayOrderId: 'order_test_1',
    amount: 1099,
    clientName: 'Test Client',
    contact: '9999999999',
    logs: [{ message: 'created' }]
  });
  assert.ok(payment?._id);
  const found = await Payment.findOne({ razorpayOrderId: 'order_test_1' });
  assert.equal(found.amount, 1099);
  assert.equal(found.status, 'created');
});

test('financeService.processWebhookEvent marks failed payment idempotently', async () => {
  await Payment.create({
    razorpayOrderId: 'order_f1',
    razorpayPaymentId: 'pay_f1',
    amount: 1099,
    clientName: 'C',
    contact: '1',
    status: 'created'
  });
  const r1 = await financeService.processWebhookEvent({
    event: 'payment.failed',
    paymentEntity: { id: 'pay_f1', order_id: 'order_f1', error_description: 'bad' }
  });
  assert.equal(r1.status, 'ok');
  let p = await Payment.findOne({ razorpayPaymentId: 'pay_f1' });
  assert.equal(p.status, 'failed');

  const r2 = await financeService.processWebhookEvent({
    event: 'payment.failed',
    paymentEntity: { id: 'pay_f1', order_id: 'order_f1', error_description: 'bad' }
  });
  assert.equal(r2.message, 'Already marked failed');
  p = await Payment.findOne({ razorpayPaymentId: 'pay_f1' });
  assert.equal(p.status, 'failed');
});

test('financeService.processWebhookEvent refunds payment and updates order', async () => {
  await Order.create({
    orderId: 'VCM-REF-1',
    clientName: 'C',
    phone: '1',
    amount: 1099,
    paymentStatus: 'success'
  });
  await Payment.create({
    razorpayOrderId: 'order_r1',
    razorpayPaymentId: 'pay_r1',
    amount: 1099,
    clientName: 'C',
    contact: '1',
    status: 'captured',
    orderId: 'VCM-REF-1'
  });

  const r = await financeService.processWebhookEvent({
    event: 'payment.refunded',
    paymentEntity: { id: 'pay_r1', order_id: 'order_r1' }
  });
  assert.equal(r.status, 'ok');

  const p = await Payment.findOne({ razorpayPaymentId: 'pay_r1' });
  const o = await Order.findOne({ orderId: 'VCM-REF-1' });
  assert.equal(p.status, 'refunded');
  assert.equal(o.paymentStatus, 'refunded');
});

test('financeService.refundPayment is idempotent and safe when missing', async () => {
  const missing = await financeService.refundPayment('pay_missing');
  assert.equal(missing, null);

  await Payment.create({
    razorpayOrderId: 'order_r2',
    razorpayPaymentId: 'pay_r2',
    amount: 500,
    clientName: 'C',
    contact: '1',
    status: 'refunded'
  });
  const again = await financeService.refundPayment('pay_r2');
  assert.equal(again.status, 'refunded');
});

test('financeService.runOptionalTransaction supports fallback execution', async () => {
  const result = await financeService.runOptionalTransaction(async (session) => {
    // session may be null on standalone; operation should still work
    const p = new Payment({
      razorpayOrderId: 'order_tx_1',
      amount: 100,
      clientName: 'TX',
      contact: '1'
    });
    await p.save({ session });
    return p.razorpayOrderId;
  });
  assert.equal(result, 'order_tx_1');
  assert.equal(await Payment.countDocuments({ razorpayOrderId: 'order_tx_1' }), 1);
});
