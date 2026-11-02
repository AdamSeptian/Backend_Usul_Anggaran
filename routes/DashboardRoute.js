import express from 'express';
import { verifyUser } from '../middleware/AuthUser.js';
import { getUnitDashboard } from '../controllers/Dashboard.js';

const router = express.Router();
router.get('/dashboard/unit', verifyUser, getUnitDashboard);
export default router;
