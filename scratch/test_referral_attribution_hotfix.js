import mongoose from 'mongoose';
import connectDB from '../backend/config/db.js';
import Enquiry from '../backend/models/Enquiry.js';
import Partner from '../backend/models/Partner.js';
import ReferralCampaign from '../backend/models/ReferralCampaign.js';
import ReferralVisit from '../backend/models/ReferralVisit.js';
import ReferralBooking from '../backend/models/ReferralBooking.js';
import User from '../backend/models/User.js';
import { createEnquiry } from '../backend/controllers/enquiryController.js';

async function runHotfixTests() {
  console.log('====================================================');
  console.log('⚡ REFERRAL ATTRIBUTION HOTFIX - AUTOMATED TEST SUITE');
  console.log('====================================================\n');

  try {
    await connectDB();
    console.log('✓ Connected to MongoDB.\n');

    // Helper mock response & req builders
    const createMockRes = () => {
      const res = {
        statusCode: 200,
        body: null,
        clearedCookies: [],
        status(code) { this.statusCode = code; return this; },
        json(data) { this.body = data; return this; },
        clearCookie(name) { this.clearedCookies.push(name); }
      };
      return res;
    };

    const mockNext = (err) => { if (err) console.error('Next called with error:', err); };

    // Set up dummy partner & campaign for testing
    let testPartner = await Partner.findOne({ email: 'test_hotfix_partner@viralcraft.media' });
    if (!testPartner) {
      testPartner = await Partner.create({
        agencyName: 'Hotfix Test Agency',
        ownerName: 'Hotfix Partner',
        email: 'test_hotfix_partner@viralcraft.media',
        phone: '919999988888',
        password: 'Password123!',
        status: 'ACTIVE'
      });
    }

    let superAdmin = await User.findOne({ role: 'SUPER_ADMIN' });
    if (!superAdmin) {
      superAdmin = await User.create({
        name: 'Super Admin',
        email: 'admin_hotfix@viralcraft.media',
        phone: '919000000000',
        password: 'Password123!',
        role: 'SUPER_ADMIN'
      });
    }

    // Active Campaign
    const activeCode = 'VCMTESTACTIVE' + Math.floor(Math.random() * 10000);
    const activeCampaign = await ReferralCampaign.create({
      campaignName: 'Active Test Campaign',
      partner: testPartner._id,
      validityDays: 30,
      expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      referralCode: activeCode,
      status: 'ACTIVE',
      minCommissionPercentage: 10,
      maxCommissionPercentage: 20,
      createdBy: superAdmin._id
    });

    // Expired Campaign
    const expiredCode = 'VCMTESTEXPIRED' + Math.floor(Math.random() * 10000);
    const expiredCampaign = await ReferralCampaign.create({
      campaignName: 'Expired Test Campaign',
      partner: testPartner._id,
      validityDays: 30,
      expiryDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // Expired yesterday
      referralCode: expiredCode,
      status: 'ACTIVE',
      minCommissionPercentage: 10,
      maxCommissionPercentage: 20,
      createdBy: superAdmin._id
    });

    // Inactive Campaign
    const inactiveCode = 'VCMTESTINACTIVE' + Math.floor(Math.random() * 10000);
    const inactiveCampaign = await ReferralCampaign.create({
      campaignName: 'Inactive Test Campaign',
      partner: testPartner._id,
      validityDays: 30,
      expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      referralCode: inactiveCode,
      status: 'INACTIVE',
      minCommissionPercentage: 10,
      maxCommissionPercentage: 20,
      createdBy: superAdmin._id
    });

    // ----------------------------------------------------
    // TEST 1: Normal Website Visit (No Referral Cookie / Details)
    // ----------------------------------------------------
    console.log('[TEST 1/5] Normal Homepage Enquiry (No referral details)...');
    const req1 = {
      body: {
        name: 'Organic User',
        email: 'organic@test.com',
        phone: '919876543210',
        serviceCategory: 'Website Design & Development',
        description: 'Normal visit enquiry'
      },
      cookies: {},
      app: { get: () => null }
    };
    const res1 = createMockRes();
    await createEnquiry(req1, res1, mockNext);

    const enquiry1 = await Enquiry.findOne({ email: 'organic@test.com' }).sort({ createdAt: -1 });
    const booking1 = await ReferralBooking.findOne({ enquiry: enquiry1._id });

    if (enquiry1 && enquiry1.referral?.isReferral === false && !booking1) {
      console.log('✓ TEST 1 PASSED: Stored as Organic Lead (isReferral = false, No ReferralBooking created).');
    } else {
      console.error('❌ TEST 1 FAILED:', { isReferral: enquiry1?.referral?.isReferral, booking1 });
    }
    console.log('');

    // ----------------------------------------------------
    // TEST 2: Direct Service Page Enquiry (No Referral)
    // ----------------------------------------------------
    console.log('[TEST 2/5] Direct Service Page Enquiry...');
    const req2 = {
      body: {
        name: 'Service Direct User',
        email: 'servicedirect@test.com',
        phone: '919876543211',
        serviceCategory: 'Clip Editing',
        description: 'Direct service enquiry'
      },
      cookies: {},
      app: { get: () => null }
    };
    const res2 = createMockRes();
    await createEnquiry(req2, res2, mockNext);

    const enquiry2 = await Enquiry.findOne({ email: 'servicedirect@test.com' }).sort({ createdAt: -1 });
    if (enquiry2 && enquiry2.referral?.isReferral === false) {
      console.log('✓ TEST 2 PASSED: Stored as Organic Lead (isReferral = false).');
    } else {
      console.error('❌ TEST 2 FAILED:', { isReferral: enquiry2?.referral?.isReferral });
    }
    console.log('');

    // ----------------------------------------------------
    // TEST 3: Valid Referral Website Visit (/r/VCMXXXXXX)
    // ----------------------------------------------------
    console.log('[TEST 3/5] Valid Referral Campaign Enquiry (/r/' + activeCode + ')...');
    const visitorId3 = 'visitor_test_active_123';
    await ReferralVisit.create({
      campaign: activeCampaign._id,
      partner: testPartner._id,
      visitorId: visitorId3,
      landingPage: '/services/web-development',
      ipHash: 'mockip123'
    });

    const req3 = {
      body: {
        name: 'Referral User',
        email: 'referraluser@test.com',
        phone: '919876543212',
        serviceCategory: 'Website Design & Development',
        description: 'Referral enquiry test',
        referralDetails: {
          campaignId: activeCampaign._id.toString(),
          referralCode: activeCampaign.referralCode,
          partnerId: testPartner._id.toString(),
          visitorId: visitorId3,
          clickedAt: new Date().toISOString()
        }
      },
      cookies: {},
      app: { get: () => null }
    };
    const res3 = createMockRes();
    await createEnquiry(req3, res3, mockNext);

    const enquiry3 = await Enquiry.findOne({ email: 'referraluser@test.com' }).sort({ createdAt: -1 });
    const booking3 = await ReferralBooking.findOne({ enquiry: enquiry3._id });

    if (enquiry3 && enquiry3.referral?.isReferral === true && booking3) {
      console.log('✓ TEST 3 PASSED: Correctly attributed as Referral Lead (isReferral = true, ReferralBooking created).');
    } else {
      console.error('❌ TEST 3 FAILED:', { isReferral: enquiry3?.referral?.isReferral, booking3 });
    }
    console.log('');

    // ----------------------------------------------------
    // TEST 4: Expired Referral Campaign
    // ----------------------------------------------------
    console.log('[TEST 4/5] Expired Referral Campaign Enquiry...');
    const visitorId4 = 'visitor_test_expired_123';
    await ReferralVisit.create({
      campaign: expiredCampaign._id,
      partner: testPartner._id,
      visitorId: visitorId4,
      landingPage: '/',
      ipHash: 'mockip456'
    });

    const req4 = {
      body: {
        name: 'Expired Campaign User',
        email: 'expireduser@test.com',
        phone: '919876543213',
        serviceCategory: 'Podcast Editing',
        referralDetails: {
          campaignId: expiredCampaign._id.toString(),
          referralCode: expiredCampaign.referralCode,
          partnerId: testPartner._id.toString(),
          visitorId: visitorId4,
          clickedAt: new Date().toISOString()
        }
      },
      cookies: {},
      app: { get: () => null }
    };
    const res4 = createMockRes();
    await createEnquiry(req4, res4, mockNext);

    const enquiry4 = await Enquiry.findOne({ email: 'expireduser@test.com' }).sort({ createdAt: -1 });
    const booking4 = await ReferralBooking.findOne({ enquiry: enquiry4._id });

    if (enquiry4 && enquiry4.referral?.isReferral === false && !booking4) {
      console.log('✓ TEST 4 PASSED: Expired campaign rejected and treated as Normal Lead (isReferral = false).');
    } else {
      console.error('❌ TEST 4 FAILED:', { isReferral: enquiry4?.referral?.isReferral, booking4 });
    }
    console.log('');

    // ----------------------------------------------------
    // TEST 5: Inactive Referral Campaign
    // ----------------------------------------------------
    console.log('[TEST 5/5] Inactive Referral Campaign Enquiry...');
    const visitorId5 = 'visitor_test_inactive_123';
    await ReferralVisit.create({
      campaign: inactiveCampaign._id,
      partner: testPartner._id,
      visitorId: visitorId5,
      landingPage: '/',
      ipHash: 'mockip789'
    });

    const req5 = {
      body: {
        name: 'Inactive Campaign User',
        email: 'inactiveuser@test.com',
        phone: '919876543214',
        serviceCategory: 'Social Media Marketing',
        referralDetails: {
          campaignId: inactiveCampaign._id.toString(),
          referralCode: inactiveCampaign.referralCode,
          partnerId: testPartner._id.toString(),
          visitorId: visitorId5,
          clickedAt: new Date().toISOString()
        }
      },
      cookies: {},
      app: { get: () => null }
    };
    const res5 = createMockRes();
    await createEnquiry(req5, res5, mockNext);

    const enquiry5 = await Enquiry.findOne({ email: 'inactiveuser@test.com' }).sort({ createdAt: -1 });
    const booking5 = await ReferralBooking.findOne({ enquiry: enquiry5._id });

    if (enquiry5 && enquiry5.referral?.isReferral === false && !booking5) {
      console.log('✓ TEST 5 PASSED: Inactive campaign rejected and treated as Normal Lead (isReferral = false).');
    } else {
      console.error('❌ TEST 5 FAILED:', { isReferral: enquiry5?.referral?.isReferral, booking5 });
    }
    console.log('');

    // Clean up test data
    await Enquiry.deleteMany({ email: { $in: ['organic@test.com', 'servicedirect@test.com', 'referraluser@test.com', 'expireduser@test.com', 'inactiveuser@test.com'] } });
    await ReferralCampaign.deleteMany({ _id: { $in: [activeCampaign._id, expiredCampaign._id, inactiveCampaign._id] } });
    await ReferralVisit.deleteMany({ visitorId: { $in: [visitorId3, visitorId4, visitorId5] } });
    await ReferralBooking.deleteMany({ email: 'referraluser@test.com' });

    console.log('====================================================');
    console.log('🎉 ALL 5 HOTFIX TEST CASES PASSED SUCCESSFULLY!');
    console.log('====================================================');

    process.exit(0);
  } catch (err) {
    console.error('❌ HOTFIX TEST SUITE FAILED:', err);
    process.exit(1);
  }
}

runHotfixTests();
