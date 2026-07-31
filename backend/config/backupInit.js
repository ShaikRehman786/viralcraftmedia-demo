import mongoose from 'mongoose';
import { backupPlugin } from '../services/backupService.js';

// Register backup plugin globally before any schemas are compiled
mongoose.plugin(backupPlugin);
console.log('[BACKUP] Global Mongoose backup plugin registered.');
