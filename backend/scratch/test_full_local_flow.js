import http from 'http';
import app from '../app.js';
import connectDB from '../config/db.js';
import { config } from '../config/env.js';
import User from '../models/User.js';
import jwt from 'jsonwebtoken';

async function testFullLocalFlow() {
  await connectDB();
  const server = http.createServer(app);
  await new Promise(resolve => server.listen(5001, resolve));
  console.log('Test server listening on port 5001');

  try {
    // 1. Find or create Super Admin
    const admin = await User.findOne({ role: 'SUPER_ADMIN' });
    if (!admin) throw new Error('No super admin found in DB');
    console.log('Super admin:', admin.email);

    // Sign admin token
    const token = jwt.sign(
      { id: admin._id, email: admin.email, role: admin.role },
      config.jwtSecret,
      { expiresIn: '1h' }
    );

    // 2. Clean up test user if exists
    const testEmail = 'flow_test_worker@viralcraftmedia.com';
    await User.deleteOne({ email: testEmail });

    // 3. Post /api/auth/staff
    console.log('\n--- 1. Admin sends invitation ---');
    const inviteRes = await fetch('http://localhost:5001/api/auth/staff', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        name: 'Flow Test Worker',
        email: testEmail,
        role: 'EMPLOYEE',
        department: 'Engineering',
        skills: ['React', 'Node.js']
      })
    });

    console.log('Invite Response Status:', inviteRes.status);
    const inviteData = await inviteRes.json();
    console.log('Invite Response Body:', inviteData);

    // 4. Inspect DB record for this worker
    const savedUser = await User.findOne({ email: testEmail }).lean();
    console.log('\n--- 2. Database Record ---');
    console.log({
      email: savedUser.email,
      role: savedUser.role,
      status: savedUser.status,
      invitationToken: savedUser.invitationToken,
      invitationExpires: savedUser.invitationExpires,
      now: new Date()
    });

    // 5. Test verification of token
    // In our auth.js, what was the email sent? Let's check the link
    // Let's test calling verify-invitation with the token from DB and also test accept
    // Wait, let's see what happens if we test with the actual token
  } finally {
    server.close();
    process.exit(0);
  }
}

testFullLocalFlow().catch(err => {
  console.error('Fatal error in test:', err);
  process.exit(1);
});
