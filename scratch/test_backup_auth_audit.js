import jwt from 'jsonwebtoken';
import connectDB from '../backend/config/db.js';
import User from '../backend/models/User.js';
import { config } from '../backend/config/env.js';
import { initBackupSystem } from '../backend/services/backupService.js';
import app from '../backend/app.js';
import http from 'http';

async function runAuthAuditTest() {
  console.log('====================================================');
  console.log('🛡️ BACKUP MODULE AUTHENTICATION & AUTHORIZATION AUDIT');
  console.log('====================================================\n');

  try {
    await connectDB();
    await initBackupSystem();

    // Start a temporary HTTP server
    const server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;
    const baseUrl = `http://localhost:${port}`;

    console.log(`✓ Test Server running on port ${port}\n`);

    // Helper to generate JWT tokens
    const generateToken = (id, role) => {
      return jwt.sign({ id, role }, config.jwtSecret, { expiresIn: '1h' });
    };

    // Find or create test accounts
    let superAdmin = await User.findOne({ role: 'SUPER_ADMIN' });
    if (!superAdmin) {
      superAdmin = await User.create({
        name: 'Super Admin Test',
        email: 'superadmin_audit@viralcraft.media',
        phone: '919111111111',
        password: 'Password123!',
        role: 'SUPER_ADMIN',
        status: 'active'
      });
    }

    let employee = await User.findOne({ role: 'EMPLOYEE' });
    if (!employee) {
      employee = await User.create({
        name: 'Employee Test',
        email: 'employee_audit@viralcraft.media',
        phone: '919333333333',
        password: 'Password123!',
        role: 'EMPLOYEE',
        status: 'active'
      });
    }

    const superAdminToken = generateToken(superAdmin._id.toString(), 'SUPER_ADMIN');
    const backupAdminToken = generateToken('backup_admin_mock_id_placeholder', 'BACKUP_ADMIN');
    const employeeToken = generateToken(employee._id.toString(), 'EMPLOYEE');

    const testEndpoints = [
      { method: 'GET', path: '/api/backup/collections' },
      { method: 'GET', path: '/api/backup/collections/ALL' },
      { method: 'GET', path: '/api/backup/collections-summary' },
      { method: 'GET', path: '/api/backup/activity-stream' },
      { method: 'GET', path: '/api/backup/restore-points' },
      { method: 'POST', path: '/api/backup/force-sync' }
    ];

    // TEST 1: Super Admin Access
    console.log('[TEST 1/3] Auditing Super Admin Access...');
    for (const ep of testEndpoints) {
      const res = await fetch(`${baseUrl}${ep.path}`, {
        method: ep.method,
        headers: { Authorization: `Bearer ${superAdminToken}` }
      });
      const data = await res.json();
      if (res.status === 200 && data.success) {
        console.log(`  ✓ ${ep.method} ${ep.path} -> HTTP 200 OK`);
      } else {
        console.error(`  ❌ ${ep.method} ${ep.path} -> HTTP ${res.status}:`, data);
        process.exit(1);
      }
    }
    console.log('');

    // TEST 2: Backup Admin Access
    console.log('[TEST 2/3] Auditing Backup Admin Access...');
    for (const ep of testEndpoints) {
      const res = await fetch(`${baseUrl}${ep.path}`, {
        method: ep.method,
        headers: { Authorization: `Bearer ${backupAdminToken}` }
      });
      const data = await res.json();
      if (res.status === 200 && data.success) {
        console.log(`  ✓ ${ep.method} ${ep.path} -> HTTP 200 OK`);
      } else {
        console.error(`  ❌ ${ep.method} ${ep.path} -> HTTP ${res.status}:`, data);
        process.exit(1);
      }
    }
    console.log('');

    // TEST 3: Security Enforcement Check (Unauthenticated & Unauthorized Role)
    console.log('[TEST 3/3] Verifying Security Guards (Unauthenticated & Employee Roles)...');
    
    // Unauthenticated
    const unauthRes = await fetch(`${baseUrl}/api/backup/collections`, { method: 'GET' });
    if (unauthRes.status === 401) {
      console.log('  ✓ Unauthenticated Request correctly rejected with HTTP 401 Unauthorized.');
    } else {
      console.error(`  ❌ Unauthenticated Request expected HTTP 401 but got HTTP ${unauthRes.status}`);
      process.exit(1);
    }

    // Employee Role
    const empRes = await fetch(`${baseUrl}/api/backup/collections`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${employeeToken}` }
    });
    if (empRes.status === 403) {
      console.log('  ✓ Unauthorized Role (EMPLOYEE) correctly rejected with HTTP 403 Forbidden.');
    } else {
      console.error(`  ❌ Employee Role expected HTTP 403 but got HTTP ${empRes.status}`);
      process.exit(1);
    }

    server.close();
    console.log('\n====================================================');
    console.log('🎉 ALL BACKUP AUTHORIZATION AUDIT TESTS PASSED!');
    console.log('====================================================');
    process.exit(0);
  } catch (err) {
    console.error('❌ AUTH AUDIT TEST FAILED:', err);
    process.exit(1);
  }
}

runAuthAuditTest();
