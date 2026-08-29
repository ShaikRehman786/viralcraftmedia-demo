import express from 'express';
import { 
  getProjects, 
  createProject,
  updateProject,
  deleteProject,
  getClients,
  assignStaff, 
  getProjectChat, 
  postProjectChat,
  finalApproveProject,
  acceptProjectAssignment,
  rejectProjectAssignment
} from '../controllers/taskController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// Project endpoints — mounted at /api/projects
router.get('/', protect, getProjects);
router.get('/clients', protect, authorize('SUPER_ADMIN', 'MANAGER'), getClients);
router.post('/', protect, authorize('SUPER_ADMIN', 'MANAGER'), createProject);
router.put('/:id', protect, authorize('SUPER_ADMIN', 'MANAGER'), updateProject);
router.delete('/:id', protect, authorize('SUPER_ADMIN'), deleteProject);
router.post('/:id/assign', protect, authorize('SUPER_ADMIN', 'MANAGER'), assignStaff);
router.get('/:id/chat', protect, getProjectChat);
router.post('/:id/chat', protect, postProjectChat);
router.post('/:id/final-approval', protect, authorize('SUPER_ADMIN'), finalApproveProject);
router.post('/:id/accept', protect, acceptProjectAssignment);
router.post('/:id/reject', protect, rejectProjectAssignment);

export default router;

