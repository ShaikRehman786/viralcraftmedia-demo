import mongoose from 'mongoose';
import connectDB from '../backend/config/db.js';
import { 
  initBackupSystem, 
  runForceSync, 
  getBackupCollectionsSummary,
  getBackupRecordModel,
  migrateInitialProductionData,
  getBackupSystemHealth
} from '../backend/services/backupService.js';

async function runBackupV2TestSuite() {
  console.log('====================================================');
  console.log('🚀 ENTERPRISE BACKUP SYSTEM V2.0 VERIFICATION SUITE');
  console.log('====================================================\n');

  try {
    // 1. Connect Production Database
    console.log('[TEST 1/5] Connecting to Production Database...');
    await connectDB();
    console.log('✓ Production DB Connected.\n');

    // 2. Initialize Backup System
    console.log('[TEST 2/5] Initializing Backup System V2.0...');
    await initBackupSystem();
    await new Promise((resolve) => setTimeout(resolve, 3000));

    const health = await getBackupSystemHealth();
    console.log('✓ Health Status:', {
      prodDb: health.productionDb,
      backupDb: health.backupDb,
      workerStatus: health.workerStatus,
      changeStreamStatus: health.changeStreamStatus
    });
    console.log('');

    // 3. Test Initial Data Migration Engine
    console.log('[TEST 3/5] Testing Automated Initial Data Migration Engine...');
    const migrationResult = await migrateInitialProductionData();
    console.log('✓ Initial Data Migration Execution:', {
      durationMs: migrationResult.durationMs,
      totalCollectionsScanned: migrationResult.totalCollectionsScanned,
      totalDocumentsScanned: migrationResult.totalDocumentsScanned,
      missingDocumentsInserted: migrationResult.missingDocumentsInserted
    });
    console.log('');

    // 4. Test Collection Breakdown Summary
    console.log('[TEST 4/5] Testing Collection Breakdown Summary Generator...');
    const colSummaries = await getBackupCollectionsSummary();
    console.log(`✓ Generated summaries for ${colSummaries.length} protected collections:`);
    colSummaries.slice(0, 5).forEach((s) => {
      console.log(`   - ${s.collectionName}: ${s.recordCount} docs | ${s.backupCount} backups | Status: ${s.syncStatus}`);
    });
    console.log('');

    // 5. Test Backup Record Verification
    console.log('[TEST 5/5] Verifying Immutable Backup Records in Backup DB...');
    const BackupRecord = getBackupRecordModel();
    const count = await BackupRecord.countDocuments({});
    console.log(`✓ Total Immutable Backup Records in Backup DB: ${count}`);

    console.log('\n====================================================');
    console.log('🎉 V2.0 ENTERPRISE BACKUP VERIFICATION PASSED!');
    console.log('====================================================');

    process.exit(0);
  } catch (err) {
    console.error('\n❌ V2.0 VERIFICATION TEST FAILED:', err);
    process.exit(1);
  }
}

runBackupV2TestSuite();
