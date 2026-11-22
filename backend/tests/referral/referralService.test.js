import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';

process.env.NODE_ENV = 'test';
process.env.INTERNAL_SERVICE_KEY = 'test-internal-secret-key-0123456789';
process.env.RAZORPAY_KEY_ID = 'rzp_test_placeholder';
process.env.RAZORPAY_KEY_SECRET = 'placeholder';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
process.env.FRONTEND_URL = 'http://localhost:5173';
process.env.MONGO_URI = process.env.MONGO_URI_TEST_REFERRAL || 'mongodb://127.0.0.1:27017/referral_domain_test';
process.env.BACKUP_MONGODB_URI = '';
process.env.BACKUP_JWT_SECRET = 'test-backup-secret';
process.env.PARTNER_JWT_SECRET = 'test-partner-secret';
process.env.BACKUP_ADMIN_EMAIL = 'backup-admin@example.com';
process.env.BACKUP_ADMIN_PASSWORD = 'test-backup-password';
delete process.env.REDIS_URL;

const connectDB = (await import('../../config/db.js')).default;
await connectDB();

const Partner = (await import('../../models/Partner.js')).default;
const ReferralCampaign = (await import('../../models/ReferralCampaign.js')).default;
const ReferralVisit = (await import('../../models/ReferralVisit.js')).default;
const ReferralBooking = (await import('../../models/ReferralBooking.js')).default;
const PartnerCommission = (await import('../../models/PartnerCommission.js')).default;
const PartnerPayment = (await import('../../models/PartnerPayment.js')).default;
const Enquiry = (await import('../../models/Enquiry.js')).default;
const User = (await import('../../models/User.js')).default;
const referralService = (await import('../../services/referralService.js')).default;

async function resetDb() {
  await Promise.all([
    Partner.deleteMany({}),
    ReferralCampaign.deleteMany({}),
    ReferralVisit.deleteMany({}),
    ReferralBooking.deleteMany({}),
    PartnerCommission.deleteMany({}),
    PartnerPayment.deleteMany({}),
    Enquiry.deleteMany({}),
    User.deleteMany({})
  ]);
}

async function seedBase() {
  const admin = await User.create({
    name: 'Admin',
    email: 'admin@ref.test',
    password: 'Password123!',
    role: 'SUPER_ADMIN',
    status: 'active'
  });
  const partner = await Partner.create({
    agencyName: 'Agency A',
    ownerName: 'Owner A',
    email: 'a@partner.test',
    phone: '1111111111',
    password: 'Password123!',
    status: 'ACTIVE'
  });
  const campaign = await ReferralCampaign.create({
    campaignName: 'Camp A',
    partner: partner._id,
    validityDays: 30,
    expiryDate: new Date(Date.now() + 30 * 24 * 3600 * 1000),
    referralCode: 'VCMTEST001',
    minCommissionPercentage: 10,
    maxCommissionPercentage: 20,
    createdBy: admin._id,
    status: 'ACTIVE'
  });
  const enquiry = await Enquiry.create({
    enquiryId: `ENQ-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: 'Client',
    email: 'c@test.com',
    phone: '2222222222',
    serviceCategory: 'Clip Editing',
    description: 'hi',
    status: 'pending_review'
  });
  const booking = await ReferralBooking.create({
    partner: partner._id,
    campaign: campaign._id,
    enquiry: enquiry._id,
    clientName: 'Client',
    email: 'c@test.com',
    phone: '2222222222',
    service: 'Clip Editing',
    referralTimestamp: new Date(),
    status: 'Pending'
  });
  return { admin, partner, campaign, enquiry, booking };
}

test.beforeEach(async () => {
  await resetDb();
});

test.after(async () => {
  await mongoose.connection.close();
});

test('referralService.deletePartnerCascade removes partner and related records', async () => {
  const { partner, campaign, booking } = await seedBase();
  await ReferralVisit.create({ campaign: campaign._id, partner: partner._id, visitorId: 'v1', ipHash: 'h' });
  await PartnerCommission.create({ booking: booking._id, partner: partner._id, commissionPercentage: 10, commissionAmount: 100 });
  await PartnerPayment.create({ partner: partner._id, commission: (await PartnerCommission.findOne({ booking: booking._id }))._id, amount: 100, paymentDate: new Date(), referenceNumber: 'R1' });

  const deleted = await referralService.deletePartnerCascade(partner._id);
  assert.ok(deleted);
  assert.equal(await Partner.countDocuments({ _id: partner._id }), 0);
  assert.equal(await ReferralCampaign.countDocuments({ partner: partner._id }), 0);
  assert.equal(await ReferralVisit.countDocuments({ partner: partner._id }), 0);
  assert.equal(await ReferralBooking.countDocuments({ partner: partner._id }), 0);
  assert.equal(await PartnerCommission.countDocuments({ partner: partner._id }), 0);
  assert.equal(await PartnerPayment.countDocuments({ partner: partner._id }), 0);
});

test('referralService.deleteCampaignCascade removes campaign and dependent records', async () => {
  const { partner, campaign, booking } = await seedBase();
  await ReferralVisit.create({ campaign: campaign._id, partner: partner._id, visitorId: 'v2', ipHash: 'h2' });

  const deleted = await referralService.deleteCampaignCascade(campaign._id);
  assert.ok(deleted);
  assert.equal(await ReferralCampaign.countDocuments({ _id: campaign._id }), 0);
  assert.equal(await ReferralVisit.countDocuments({ campaign: campaign._id }), 0);
  assert.equal(await ReferralBooking.countDocuments({ campaign: campaign._id }), 0);
  // booking was cascade-deleted; ensure gone
  assert.equal(await ReferralBooking.countDocuments({ _id: booking._id }), 0);
});

test('referralService.generateBookingCommission creates/updates commission and resets', async () => {
  const { admin, booking } = await seedBase();

  const result = await referralService.generateBookingCommission(booking._id, {
    bookingValue: 1000,
    commissionPercentage: 10,
    status: 'Approved'
  }, { adminUser: { _id: admin._id, name: admin.name } });
  assert.ok(result.commission);
  assert.equal(result.commission.status, 'Approved');
  assert.equal(result.commission.commissionAmount, 100);

  const paid = await referralService.generateBookingCommission(booking._id, {
    bookingValue: 1000,
    commissionPercentage: 10,
    status: 'Paid',
    paymentDate: '2026-11-22',
    transactionReference: 'TXN1'
  }, { adminUser: { _id: admin._id, name: admin.name } });
  assert.equal(paid.commission.status, 'Paid');
  assert.equal(await PartnerPayment.countDocuments({ commission: paid.commission._id }), 1);

  const reset = await referralService.generateBookingCommission(booking._id, {
    status: 'Commission Not Generated'
  }, { adminUser: { _id: admin._id, name: admin.name } });
  assert.equal(reset.reset, true);
  assert.equal(await PartnerCommission.countDocuments({ booking: booking._id }), 0);
  assert.equal(await PartnerPayment.countDocuments({}), 0);
  const bookingAfter = await ReferralBooking.findById(booking._id);
  assert.equal(bookingAfter.status, 'Pending');
});

test('referralService.updateCommissionStatus and payCommission enforce boundaries', async () => {
  const { admin, partner, booking } = await seedBase();
  const commission = await PartnerCommission.create({
    booking: booking._id,
    partner: partner._id,
    commissionPercentage: 10,
    commissionAmount: 100,
    status: 'Pending'
  });

  const approved = await referralService.updateCommissionStatus(commission._id, 'Approved', {
    adminUser: { _id: admin._id, name: admin.name }
  });
  assert.equal(approved.status, 'Approved');

  const paid = await referralService.payCommission(commission._id, {
    paymentDate: '2026-11-22',
    transactionReference: 'TX123',
    internalNotes: 'ok'
  }, { adminUser: { _id: admin._id, name: admin.name } });
  assert.equal(paid.status, 'Paid');
  const payment = await PartnerPayment.findOne({ commission: commission._id });
  assert.ok(payment);
  assert.equal(payment.referenceNumber, 'TX123');
});

test('referralService.expireCampaigns marks expired and expiring-soon campaigns', async () => {
  const { admin, partner } = await seedBase();
  await ReferralCampaign.create({
    campaignName: 'Expired',
    partner: partner._id,
    validityDays: 30,
    expiryDate: new Date(Date.now() - 24 * 3600 * 1000),
    referralCode: 'VCMEXPIRED1',
    minCommissionPercentage: 10,
    maxCommissionPercentage: 20,
    createdBy: admin._id,
    status: 'ACTIVE'
  });
  await ReferralCampaign.create({
    campaignName: 'Soon',
    partner: partner._id,
    validityDays: 30,
    expiryDate: new Date(Date.now() + 2 * 24 * 3600 * 1000),
    referralCode: 'VCMSOON001',
    minCommissionPercentage: 10,
    maxCommissionPercentage: 20,
    createdBy: admin._id,
    status: 'ACTIVE'
  });

  await referralService.expireCampaigns();

  const expired = await ReferralCampaign.findOne({ referralCode: 'VCMEXPIRED1' });
  const soon = await ReferralCampaign.findOne({ referralCode: 'VCMSOON001' });
  assert.equal(expired.status, 'EXPIRED');
  assert.equal(soon.expiringSoonAlertSent, true);
});
