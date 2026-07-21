import express from 'express';
import { 
  getProjects, 
  assignStaff, 
  getProjectChat, 
  postProjectChat,
  finalApproveProject,
  acceptProjectAssignment
} from '../controllers/taskController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// Project endpoints — mounted at /api/projects
router.get('/', protect, getProjects);
router.post('/:id/assign', protect, authorize('SUPER_ADMIN', 'MANAGER'), assignStaff);
router.get('/:id/chat', protect, getProjectChat);
router.post('/:id/chat', protect, postProjectChat);
router.post('/:id/final-approval', protect, authorize('SUPER_ADMIN'), finalApproveProject);
router.post('/:id/accept', protect, acceptProjectAssignment);

export default router;
