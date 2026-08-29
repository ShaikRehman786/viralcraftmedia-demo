import express from 'express';
import { 
  getTasks, 
  createTask,
  updateTask,
  deleteTask,
  assignTask, 
  submitTask, 
  reviewTask, 
  updateTaskHours,
  addTaskComment,
  trackTaskTime,
  addTaskDependency,
  acceptTaskAssignment,
  rejectTaskAssignment
} from '../controllers/taskController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// Tasks endpoints — mounted at /api/tasks
router.get('/', protect, getTasks);
router.post('/', protect, authorize('SUPER_ADMIN', 'MANAGER'), createTask);
router.put('/:id', protect, updateTask);
router.delete('/:id', protect, authorize('SUPER_ADMIN', 'MANAGER'), deleteTask);
router.post('/:id/assign', protect, authorize('SUPER_ADMIN', 'MANAGER'), assignTask);
router.post('/:id/accept', protect, acceptTaskAssignment);
router.post('/:id/reject', protect, rejectTaskAssignment);
router.post('/:id/submit', protect, authorize('EMPLOYEE', 'SUPER_ADMIN'), submitTask);
router.post('/:id/review', protect, authorize('MANAGER', 'SUPER_ADMIN'), reviewTask);
router.put('/:id/hours', protect, authorize('SUPER_ADMIN', 'MANAGER'), updateTaskHours);
router.post('/:id/comments', protect, addTaskComment);
router.post('/:id/time-tracking', protect, authorize('EMPLOYEE', 'SUPER_ADMIN'), trackTaskTime);
router.post('/:id/dependency', protect, authorize('SUPER_ADMIN', 'MANAGER'), addTaskDependency);

export default router;

