import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import axios from 'axios';

const router = express.Router();

// =================================#########
// TEAMLOGGER INTEGRATION CONFIGURATION
// =================================#########
// Placed inside CRM dashboard settings. To connect your production TeamLogger workspace:
// 1. Log in to your TeamLogger.com administrator portal.
// 2. Navigate to Settings -> Developer / API Access.
// 3. Generate an API Key, Workspace ID, and Organization ID.
// 4. Place these values in backend/.env under:
//    TEAM_LOGGER_API_KEY=your_api_key_here
//    TEAM_LOGGER_WORKSPACE_ID=your_workspace_id_here
//    TEAM_LOGGER_ORG_ID=your_org_id_here
// =================================#########

const API_KEY = process.env.TEAM_LOGGER_API_KEY || '';
const WORKSPACE_ID = process.env.TEAM_LOGGER_WORKSPACE_ID || '';
const ORG_ID = process.env.TEAM_LOGGER_ORG_ID || '';

// 1. Retrieve team live tracking summary (Admin Only)
router.get('/activity', protect, authorize('SUPER_ADMIN'), async (req, res, next) => {
  try {
    if (!API_KEY || !WORKSPACE_ID) {
      return res.status(200).json({ success: true, data: null });
    }

    try {
      const response = await axios.get(`https://api.teamlogger.com/v1/workspaces/${WORKSPACE_ID}/activity`, {
        headers: { 'Authorization': `Bearer ${API_KEY}` }
      });
      return res.status(200).json({ success: true, data: response.data });
    } catch (err) {
      console.warn('TeamLogger API call failed:', err.message);
      return res.status(200).json({ success: true, data: null, error: 'API connection failed' });
    }
  } catch (err) {
    next(err);
  }
});

// 2. Fetch live screenshot uploads (Admin Only)
router.get('/screenshots', protect, authorize('SUPER_ADMIN'), async (req, res, next) => {
  try {
    if (!API_KEY || !WORKSPACE_ID) {
      return res.status(200).json({ success: true, data: [] });
    }

    try {
      const response = await axios.get(`https://api.teamlogger.com/v1/workspaces/${WORKSPACE_ID}/screenshots`, {
        headers: { 'Authorization': `Bearer ${API_KEY}` }
      });
      return res.status(200).json({ success: true, data: response.data });
    } catch (err) {
      console.warn('TeamLogger API call failed:', err.message);
      return res.status(200).json({ success: true, data: [], error: 'API connection failed' });
    }
  } catch (err) {
    next(err);
  }
});

export default router;
