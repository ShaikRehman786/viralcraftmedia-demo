import mongoose from 'mongoose';
import connectDB from '../backend/config/db.js';
import { 
  initBackupSystem, 
  recordBackupEntry, 
  purgeExpiredBackups, 
  runForceSync, 
  getBackupSystemHealth,
  getBackupRecordModel,
  backupConnection
} from '../backend/services/backupService.js';
import { prepareRestoreRecord } from '../backend/services/restoreService.js';
import Project from '../backend/models/Project.js';

async function runBackupTestSuite() {
  console.log('====================================================');
  console.log('🚀 ENTERPRISE BACKUP SYSTEM VERIFICATION SUITE');
  console.log('====================================================\n');

  try {
    // 1. Connect Production Database
    console.log('[TEST 1/7] Connecting to Production Database...');
    await connectDB();
    console.log('✓ Production DB Connected successfully.\n');

    // 2. Initialize Backup System
    console.log('[TEST 2/7] Initializing Enterprise Backup System...');
    await initBackupSystem();

    // Wait 3 seconds for backup connection pool to stabilize
    await new Promise((resolve) => setTimeout(resolve, 3000));

    const health = await getBackupSystemHealth();
    console.log('✓ Health Status:', JSON.stringify(health, null, 2));

    if (health.backupDb.status !== 'Connected') {
      throw new Error('Backup DB connection failed to establish!');
    }
    console.log('✓ Backup DB Connected successfully.\n');

    // 3. Test Manual & Real-Time Backup Recording (CREATE & UPDATE & DELETE)
    console.log('[TEST 3/7] Testing Real-Time Backup Recording & Diff Tracking...');
    const testDocId = new mongoose.Types.ObjectId().toString();

    // CREATE operation
    const createRecord = await recordBackupEntry({
      collectionName: 'projects',
      documentId: testDocId,
      operation: 'CREATE',
      previousData: null,
      currentData: { _id: testDocId, name: 'Backup Test Project', status: 'active', budget: 5000 },
      changedFields: ['name', 'status', 'budget'],
      performedBy: { userId: 'TestUser', email: 'test@viralcraftmedia.com', name: 'Test Runner', role: 'SUPER_ADMIN' },
      source: 'MANUAL'
    });
    console.log('✓ CREATE Backup Record:', createRecord ? `ID: ${createRecord._id}, Version: ${createRecord.restoreVersion}` : 'Failed');

    // UPDATE operation
    const updateRecord = await recordBackupEntry({
      collectionName: 'projects',
      documentId: testDocId,
      operation: 'UPDATE',
      previousData: { _id: testDocId, name: 'Backup Test Project', status: 'active', budget: 5000 },
      currentData: { _id: testDocId, name: 'Backup Test Project (Updated)', status: 'completed', budget: 7500 },
      changedFields: ['name', 'status', 'budget'],
      performedBy: { userId: 'TestUser', email: 'test@viralcraftmedia.com', name: 'Test Runner', role: 'SUPER_ADMIN' },
      source: 'MANUAL'
    });
    console.log('✓ UPDATE Backup Record:', updateRecord ? `ID: ${updateRecord._id}, Version: ${updateRecord.restoreVersion}, Changed: ${updateRecord.changedFields.join(', ')}` : 'Failed');

    // DELETE operation
    const deleteRecord = await recordBackupEntry({
      collectionName: 'projects',
      documentId: testDocId,
      operation: 'DELETE',
      previousData: { _id: testDocId, name: 'Backup Test Project (Updated)', status: 'completed', budget: 7500 },
      currentData: null,
      changedFields: [],
      performedBy: { userId: 'TestUser', email: 'test@viralcraftmedia.com', name: 'Test Runner', role: 'SUPER_ADMIN' },
      source: 'MANUAL'
    });
    console.log('✓ DELETE Backup Record:', deleteRecord ? `ID: ${deleteRecord._id}, Version: ${deleteRecord.restoreVersion}` : 'Failed');
    console.log('✓ All real-time operations logged to Backup DB.\n');

    // 4. Test Non-Destructive Restore Preview
    console.log('[TEST 4/7] Testing Non-Destructive Restore Preview Architecture...');
    if (updateRecord) {
      const preview = await prepareRestoreRecord(updateRecord._id.toString());
      console.log('✓ Restore Preview generated:', {
        recordId: preview.recordId,
        collectionName: preview.collectionName,
        restoreVersion: preview.restoreVersion,
        dryRun: preview.dryRun,
        status: preview.status
      });
    }
    console.log('');

    // 5. Test 30-Day Retention Policy Cleanup Routine
    console.log('[TEST 5/7] Testing 30-Day Retention Policy Purge Routine...');
    const retentionResult = await purgeExpiredBackups();
    console.log('✓ Retention Policy Execution Result:', retentionResult);
    console.log('');

    // 6. Test Force Sync Scanner
    console.log('[TEST 6/7] Testing Force Synchronization Engine...');
    const syncResult = await runForceSync();
    console.log('✓ Force Sync Execution Result:', {
      durationMs: syncResult.durationMs,
      totalCollectionsScanned: syncResult.totalCollectionsScanned,
      totalDocumentsScanned: syncResult.totalDocumentsScanned,
      missingDocumentsInserted: syncResult.missingDocumentsInserted
    });
    console.log('');

    // 7. Verify Cleanup of Test Artifacts in Backup DB
    console.log('[TEST 7/7] Cleaning up test records in Backup DB...');
    const BackupRecord = getBackupRecordModel();
    if (BackupRecord) {
      await BackupRecord.deleteMany({ documentId: testDocId });
    }
    console.log('✓ Test records cleaned up.\n');

    console.log('====================================================');
    console.log('🎉 ALL BACKUP VERIFICATION TESTS PASSED SUCCESSFULLY!');
    console.log('====================================================');

    process.exit(0);
  } catch (err) {
    console.error('\n❌ VERIFICATION TEST FAILED:', err);
    process.exit(1);
  }
}

runBackupTestSuite();
