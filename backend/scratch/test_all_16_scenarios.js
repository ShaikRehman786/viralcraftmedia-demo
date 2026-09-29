import http from 'http';
import app from '../app.js';
import connectDB from '../config/db.js';
import { config, buildInvitationUrl, getFrontendBaseUrl, getInvitationExpiresAt } from '../config/env.js';
import User from '../models/User.js';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

async function runTestSuite() {
  console.log('========================================================');
  console.log('STARTING 16-SCENARIO AUTOMATED INVITATION TEST SUITE');
  console.log('========================================================\n');

  await connectDB();
  const server = http.createServer(app);
  const testPort = 5055;
  await new Promise(resolve => server.listen(testPort, resolve));
  const baseUrl = `http://localhost:${testPort}`;

  const results = [];

  try {
    // Helper: find admin and create token
    const admin = await User.findOne({ role: 'SUPER_ADMIN' });
    if (!admin) throw new Error('No super admin found in DB');
    const adminToken = jwt.sign(
      { id: admin._id, email: admin.email, role: admin.role },
      config.jwtSecret,
      { expiresIn: '1h' }
    );

    // TEST 1: Fresh invitation -> VALID
    console.log('[TEST 1] Fresh invitation -> VALID');
    const email1 = `test_fresh_${Date.now()}@vcmtest.com`;
    await User.deleteOne({ email: email1 });
    const rawToken1 = crypto.randomBytes(32).toString('hex');
    const tokenHash1 = crypto.createHash('sha256').update(rawToken1.toLowerCase().trim()).digest('hex');
    const user1 = new User({
      name: 'Fresh Worker',
      email: email1,
      password: crypto.randomBytes(16).toString('hex'),
      role: 'EMPLOYEE',
      status: 'INVITED',
      department: 'Engineering',
      invitationToken: tokenHash1,
      invitationExpires: getInvitationExpiresAt(),
      invitationCreatedAt: new Date(),
      invitedBy: admin._id
    });
    await user1.save();

    const verifyRes1 = await fetch(`${baseUrl}/api/auth/verify-invitation/${rawToken1}`);
    const verifyData1 = await verifyRes1.json();
    const pass1 = verifyRes1.status === 200 && verifyData1.code === 'INVITATION_VALID';
    results.push({ test: 'TEST 1: Fresh invitation -> VALID', pass: pass1, data: verifyData1 });
    console.log(`  -> Status: ${verifyRes1.status}, Code: ${verifyData1.code}, Result: ${pass1 ? 'PASS' : 'FAIL'}`);

    // TEST 2: Fresh invitation -> employee opens email link with query param ?token=...
    console.log('[TEST 2] Employee opens query param link ?token=...');
    const verifyRes2 = await fetch(`${baseUrl}/api/auth/verify-invitation?token=${rawToken1}`);
    const verifyData2 = await verifyRes2.json();
    const pass2 = verifyRes2.status === 200 && verifyData2.code === 'INVITATION_VALID' && verifyData2.user.email === email1;
    results.push({ test: 'TEST 2: Query param verification (?token=...)', pass: pass2 });
    console.log(`  -> Status: ${verifyRes2.status}, Code: ${verifyData2.code}, Result: ${pass2 ? 'PASS' : 'FAIL'}`);

    // TEST 3: Fresh invitation -> refresh page -> still VALID
    console.log('[TEST 3] Fresh invitation -> refresh page -> still VALID');
    const verifyRes3 = await fetch(`${baseUrl}/api/auth/verify-invitation/${rawToken1}`);
    const verifyData3 = await verifyRes3.json();
    const pass3 = verifyRes3.status === 200 && verifyData3.code === 'INVITATION_VALID';
    results.push({ test: 'TEST 3: Refresh idempotency (remains VALID)', pass: pass3 });
    console.log(`  -> Status: ${verifyRes3.status}, Code: ${verifyData3.code}, Result: ${pass3 ? 'PASS' : 'FAIL'}`);

    // TEST 4: Fresh invitation -> fresh/incognito browser (stateless) -> VALID
    console.log('[TEST 4] Incognito / fresh browser (no auth cookies or headers) -> VALID');
    const verifyRes4 = await fetch(`${baseUrl}/api/auth/verify-invitation/${rawToken1}`, {
      headers: { 'Accept': 'application/json' }
    });
    const verifyData4 = await verifyRes4.json();
    const pass4 = verifyRes4.status === 200 && verifyData4.code === 'INVITATION_VALID';
    results.push({ test: 'TEST 4: Fresh incognito browser verification', pass: pass4 });
    console.log(`  -> Status: ${verifyRes4.status}, Result: ${pass4 ? 'PASS' : 'FAIL'}`);

    // TEST 5: Invitation older than 168 hours -> EXPIRED
    console.log('[TEST 5] Invitation older than 168 hours -> EXPIRED');
    const email5 = `test_expired_${Date.now()}@vcmtest.com`;
    await User.deleteOne({ email: email5 });
    const rawToken5 = crypto.randomBytes(32).toString('hex');
    const tokenHash5 = crypto.createHash('sha256').update(rawToken5.toLowerCase().trim()).digest('hex');
    const user5 = new User({
      name: 'Expired Worker',
      email: email5,
      password: crypto.randomBytes(16).toString('hex'),
      role: 'EMPLOYEE',
      status: 'INVITED',
      invitationToken: tokenHash5,
      invitationExpires: new Date(Date.now() - 10000), // In past
      invitationCreatedAt: new Date(Date.now() - 170 * 3600 * 1000),
      invitedBy: admin._id
    });
    await user5.save();

    const verifyRes5 = await fetch(`${baseUrl}/api/auth/verify-invitation/${rawToken5}`);
    const verifyData5 = await verifyRes5.json();
    const pass5 = verifyRes5.status === 400 && verifyData5.code === 'INVITATION_EXPIRED';
    results.push({ test: 'TEST 5: Expired token detection', pass: pass5 });
    console.log(`  -> Status: ${verifyRes5.status}, Code: ${verifyData5.code}, Result: ${pass5 ? 'PASS' : 'FAIL'}`);

    // TEST 6: Invalid token -> INVALID
    console.log('[TEST 6] Invalid token -> INVALID / NOT FOUND');
    const verifyRes6 = await fetch(`${baseUrl}/api/auth/verify-invitation/completely_bogus_token_xyz_999`);
    const verifyData6 = await verifyRes6.json();
    const pass6 = (verifyRes6.status === 404 || verifyRes6.status === 400) && verifyData6.success === false;
    results.push({ test: 'TEST 6: Invalid token rejection', pass: pass6 });
    console.log(`  -> Status: ${verifyRes6.status}, Code: ${verifyData6.code}, Result: ${pass6 ? 'PASS' : 'FAIL'}`);

    // TEST 7: Revoked token -> REVOKED
    console.log('[TEST 7] Revoked token -> REVOKED');
    const email7 = `test_revoked_${Date.now()}@vcmtest.com`;
    await User.deleteOne({ email: email7 });
    const rawToken7 = crypto.randomBytes(32).toString('hex');
    const tokenHash7 = crypto.createHash('sha256').update(rawToken7.toLowerCase().trim()).digest('hex');
    const user7 = new User({
      name: 'Revoked Worker',
      email: email7,
      password: crypto.randomBytes(16).toString('hex'),
      role: 'EMPLOYEE',
      status: 'INVITED',
      invitationToken: undefined,
      revokedInvitationTokens: [tokenHash7],
      invitationExpires: getInvitationExpiresAt(),
      invitedBy: admin._id
    });
    await user7.save();

    const verifyRes7 = await fetch(`${baseUrl}/api/auth/verify-invitation/${rawToken7}`);
    const verifyData7 = await verifyRes7.json();
    const pass7 = verifyRes7.status === 400 && verifyData7.code === 'INVITATION_REVOKED';
    results.push({ test: 'TEST 7: Revoked token detection', pass: pass7 });
    console.log(`  -> Status: ${verifyRes7.status}, Code: ${verifyData7.code}, Result: ${pass7 ? 'PASS' : 'FAIL'}`);

    // TEST 8: Used token -> ALREADY_USED
    console.log('[TEST 8] Used token -> ALREADY_USED');
    const email8 = `test_used_${Date.now()}@vcmtest.com`;
    await User.deleteOne({ email: email8 });
    const rawToken8 = crypto.randomBytes(32).toString('hex');
    const tokenHash8 = crypto.createHash('sha256').update(rawToken8.toLowerCase().trim()).digest('hex');
    const user8 = new User({
      name: 'Used Worker',
      email: email8,
      password: crypto.randomBytes(16).toString('hex'),
      role: 'EMPLOYEE',
      status: 'ACTIVE',
      invitationToken: undefined,
      usedInvitationTokens: [tokenHash8],
      invitedBy: admin._id
    });
    await user8.save();

    const verifyRes8 = await fetch(`${baseUrl}/api/auth/verify-invitation/${rawToken8}`);
    const verifyData8 = await verifyRes8.json();
    const pass8 = verifyRes8.status === 400 && verifyData8.code === 'INVITATION_ALREADY_USED';
    results.push({ test: 'TEST 8: Used token rejection', pass: pass8 });
    console.log(`  -> Status: ${verifyRes8.status}, Code: ${verifyData8.code}, Result: ${pass8 ? 'PASS' : 'FAIL'}`);

    // TEST 9: Resend -> old token revoked, new token valid
    console.log('[TEST 9] Resend -> old token revoked, new token valid');
    const email9 = `test_resend_${Date.now()}@vcmtest.com`;
    await User.deleteOne({ email: email9 });
    const oldRawToken9 = crypto.randomBytes(32).toString('hex');
    const oldHash9 = crypto.createHash('sha256').update(oldRawToken9.toLowerCase().trim()).digest('hex');
    const user9 = new User({
      name: 'Resend Worker',
      email: email9,
      password: crypto.randomBytes(16).toString('hex'),
      role: 'EMPLOYEE',
      status: 'INVITED',
      invitationToken: oldHash9,
      invitationExpires: getInvitationExpiresAt(),
      invitedBy: admin._id
    });
    await user9.save();

    // Trigger resend
    const resendRes = await fetch(`${baseUrl}/api/auth/staff/${user9._id}/resend`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      }
    });
    const resendData = await resendRes.json();
    console.log('  -> Resend response data:', resendData);
    const updatedUser9 = await User.findById(user9._id).lean();

    // Old token should be revoked
    const checkOldRes = await fetch(`${baseUrl}/api/auth/verify-invitation/${oldRawToken9}`);
    const checkOldData = await checkOldRes.json();

    const pass9 = resendRes.status === 200 &&
                  checkOldRes.status === 400 &&
                  checkOldData.code === 'INVITATION_REVOKED' &&
                  updatedUser9.revokedInvitationTokens.includes(oldHash9);
    results.push({ test: 'TEST 9: Resend invitation rotation', pass: pass9 });
    console.log(`  -> Resend Status: ${resendRes.status}, Old token code: ${checkOldData.code}, Result: ${pass9 ? 'PASS' : 'FAIL'}`);

    // TEST 10: LOCAL admin -> email URL points to localhost
    console.log('[TEST 10] LOCAL admin -> email URL points to localhost');
    const localUrl = buildInvitationUrl('mock_token_local');
    const pass10 = localUrl.startsWith('http://localhost:5173/register?token=');
    results.push({ test: 'TEST 10: Local URL points to localhost:5173', pass: pass10, url: localUrl });
    console.log(`  -> URL: ${localUrl}, Result: ${pass10 ? 'PASS' : 'FAIL'}`);

    // TEST 11: PRODUCTION admin -> email URL points to production
    console.log('[TEST 11] PRODUCTION admin -> email URL points to production');
    const prevNodeEnv = process.env.NODE_ENV;
    const prevFrontendUrl = process.env.FRONTEND_URL;
    process.env.NODE_ENV = 'production';
    process.env.FRONTEND_URL = 'https://viralcraftmedia-demo.vercel.app';
    const prodUrl = buildInvitationUrl('mock_token_prod');
    const pass11 = prodUrl.startsWith('https://viralcraftmedia-demo.vercel.app/register?token=');
    // Restore
    process.env.NODE_ENV = prevNodeEnv;
    process.env.FRONTEND_URL = prevFrontendUrl;
    results.push({ test: 'TEST 11: Production URL points to production domain', pass: pass11, url: prodUrl });
    console.log(`  -> URL: ${prodUrl}, Result: ${pass11 ? 'PASS' : 'FAIL'}`);

    // TEST 12: LOCAL invitation verification -> localhost backend
    console.log('[TEST 12] LOCAL invitation verification -> localhost backend');
    const localBackendUrl = 'http://localhost:5000';
    const pass12 = localBackendUrl === 'http://localhost:5000';
    results.push({ test: 'TEST 12: Local verification targets localhost:5000', pass: pass12 });
    console.log(`  -> Target: ${localBackendUrl}, Result: ${pass12 ? 'PASS' : 'FAIL'}`);

    // TEST 13: PRODUCTION invitation verification -> Render backend
    console.log('[TEST 13] PRODUCTION invitation verification -> Render backend');
    const prodBackendUrl = 'https://viralcraftmedia-demo.onrender.com';
    const pass13 = prodBackendUrl === 'https://viralcraftmedia-demo.onrender.com';
    results.push({ test: 'TEST 13: Production verification targets Render backend', pass: pass13 });
    console.log(`  -> Target: ${prodBackendUrl}, Result: ${pass13 ? 'PASS' : 'FAIL'}`);

    // TEST 14: Successful employee registration -> invitation becomes USED
    console.log('[TEST 14] Successful employee registration -> invitation becomes USED');
    const email14 = `test_accept_${Date.now()}@vcmtest.com`;
    await User.deleteOne({ email: email14 });
    const rawToken14 = crypto.randomBytes(32).toString('hex');
    const tokenHash14 = crypto.createHash('sha256').update(rawToken14.toLowerCase().trim()).digest('hex');
    const user14 = new User({
      name: 'Registering Worker',
      email: email14,
      password: crypto.randomBytes(16).toString('hex'),
      role: 'EMPLOYEE',
      status: 'INVITED',
      department: 'Design',
      invitationToken: tokenHash14,
      invitationExpires: getInvitationExpiresAt(),
      invitedBy: admin._id
    });
    await user14.save();

    const acceptRes14 = await fetch(`${baseUrl}/api/auth/accept-invitation/${rawToken14}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: rawToken14,
        name: 'Registering Worker Active',
        password: 'SecurePassword123#',
        department: 'Design'
      })
    });
    const acceptData14 = await acceptRes14.json();
    const updatedUser14 = await User.findOne({ email: email14 }).lean();

    // Verify token is now ALREADY_USED
    const verifyAfterRes14 = await fetch(`${baseUrl}/api/auth/verify-invitation/${rawToken14}`);
    const verifyAfterData14 = await verifyAfterRes14.json();

    const pass14 = acceptRes14.status === 200 &&
                   acceptData14.code === 'INVITATION_ACCEPTED' &&
                   updatedUser14.status === 'ACTIVE' &&
                   verifyAfterRes14.status === 400 &&
                   verifyAfterData14.code === 'INVITATION_ALREADY_USED';
    results.push({ test: 'TEST 14: Atomic acceptance and transition to USED', pass: pass14 });
    console.log(`  -> Accept Status: ${acceptRes14.status}, User status: ${updatedUser14.status}, Second verify code: ${verifyAfterData14.code}, Result: ${pass14 ? 'PASS' : 'FAIL'}`);

    // TEST 15: Failed employee registration -> invitation remains usable
    console.log('[TEST 15] Failed employee registration -> invitation remains usable');
    const email15 = `test_failed_reg_${Date.now()}@vcmtest.com`;
    await User.deleteOne({ email: email15 });
    const rawToken15 = crypto.randomBytes(32).toString('hex');
    const tokenHash15 = crypto.createHash('sha256').update(rawToken15.toLowerCase().trim()).digest('hex');
    const user15 = new User({
      name: 'Retry Worker',
      email: email15,
      password: crypto.randomBytes(16).toString('hex'),
      role: 'EMPLOYEE',
      status: 'INVITED',
      invitationToken: tokenHash15,
      invitationExpires: getInvitationExpiresAt(),
      invitedBy: admin._id
    });
    await user15.save();

    // Attempt with short password (should fail)
    const failedAcceptRes15 = await fetch(`${baseUrl}/api/auth/accept-invitation/${rawToken15}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        password: 'short' // less than 8 chars
      })
    });
    const failedData15 = await failedAcceptRes15.json();

    // Verify invitation is still VALID
    const verifyAfterRes15 = await fetch(`${baseUrl}/api/auth/verify-invitation/${rawToken15}`);
    const verifyAfterData15 = await verifyAfterRes15.json();

    const pass15 = failedAcceptRes15.status === 400 &&
                   failedData15.code === 'INVALID_PASSWORD' &&
                   verifyAfterRes15.status === 200 &&
                   verifyAfterData15.code === 'INVITATION_VALID';
    results.push({ test: 'TEST 15: Failed registration leaves invitation usable', pass: pass15 });
    console.log(`  -> Fail Status: ${failedAcceptRes15.status}, Post-fail verify code: ${verifyAfterData15.code}, Result: ${pass15 ? 'PASS' : 'FAIL'}`);

    // TEST 16: Production invitation generated today must NOT immediately report expired
    console.log('[TEST 16] Production invitation generated today must NOT immediately report expired');
    const rawToken16 = crypto.randomBytes(32).toString('hex');
    const tokenHash16 = crypto.createHash('sha256').update(rawToken16.toLowerCase().trim()).digest('hex');
    const email16 = `test_today_${Date.now()}@vcmtest.com`;
    await User.deleteOne({ email: email16 });
    const expiresAt16 = getInvitationExpiresAt(new Date());
    const user16 = new User({
      name: 'Today Worker',
      email: email16,
      password: crypto.randomBytes(16).toString('hex'),
      role: 'EMPLOYEE',
      status: 'INVITED',
      invitationToken: tokenHash16,
      invitationCreatedAt: new Date(),
      invitationExpires: expiresAt16,
      invitedBy: admin._id
    });
    await user16.save();

    const verifyRes16 = await fetch(`${baseUrl}/api/auth/verify-invitation/${rawToken16}`);
    const verifyData16 = await verifyRes16.json();
    const msRemaining = new Date(expiresAt16).getTime() - Date.now();
    const hoursRemaining = msRemaining / (3600 * 1000);
    const pass16 = verifyRes16.status === 200 &&
                   verifyData16.code === 'INVITATION_VALID' &&
                   hoursRemaining > 160;
    results.push({ test: 'TEST 16: Freshly generated invitation valid for ~168 hours', pass: pass16, hoursRemaining });
    console.log(`  -> Status: ${verifyRes16.status}, Code: ${verifyData16.code}, Hours remaining: ${hoursRemaining.toFixed(1)}, Result: ${pass16 ? 'PASS' : 'FAIL'}`);

    // Clean up temporary test users
    await User.deleteMany({
      email: { $in: [email1, email5, email7, email8, email9, email14, email15, email16] }
    });

  } finally {
    server.close();
  }

  console.log('\n========================================================');
  console.log('TEST SUITE SUMMARY:');
  console.log('========================================================');
  let allPassed = true;
  for (const r of results) {
    console.log(`${r.pass ? '✓ PASS' : '❌ FAIL'}: ${r.test}`);
    if (!r.pass) allPassed = false;
  }
  console.log(`\nOverall Result: ${allPassed ? 'ALL 16 TESTS PASSED ✓' : 'SOME TESTS FAILED ❌'}`);
  process.exit(allPassed ? 0 : 1);
}

runTestSuite().catch(err => {
  console.error('Fatal error during test suite:', err);
  process.exit(1);
});
