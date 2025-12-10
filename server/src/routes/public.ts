import { Router } from 'express';
import {
    getPublicStats,
    getPublicComplaints
} from '../controllers/complaintController';

const router = Router();

// Public Routes
router.get('/stats', getPublicStats);
router.get('/complaints', getPublicComplaints);

export default router;
