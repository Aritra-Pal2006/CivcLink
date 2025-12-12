import { Router } from 'express';
import {
    createComplaint,
    updateComplaint,
    resolveComplaint,
    reopenComplaint,
    rejectComplaint,
    getComplaintTimeline,
    getComplaints,
    getPublicStats,
    getEscalatedComplaints,
    getPublicFeed,
    getAdminStats
} from '../controllers/complaintController';

const router = Router();

// Public Stats
router.get('/public/stats', getPublicStats);
router.get('/public/feed', getPublicFeed);

// Create a new complaint
router.post('/', createComplaint);

// Get complaints with filters
router.get('/', getComplaints);

// Get Admin Stats (Counts)
router.get('/admin/stats', getAdminStats);

// Get escalated complaints (City Admin)
router.get('/escalated', getEscalatedComplaints);

// Update complaint details (Admin: submitted -> in_progress)
router.put('/:id', updateComplaint);

// Resolve complaint (Admin: in_progress -> resolved)
router.put('/:id/resolve', resolveComplaint);

// Reopen complaint (Citizen: resolved -> reopened)
router.put('/:id/reopen', reopenComplaint);

// Reject complaint (Admin: submitted/in_progress -> rejected)
router.put('/:id/reject', rejectComplaint);

// Get complaint timeline
router.get('/:id/timeline', getComplaintTimeline);

import multer from 'multer';
import { transcribeAudio, transcribeComplaint } from '../controllers/complaintController';
import { verifyToken } from '../middleware/auth';

const upload = multer({ storage: multer.memoryStorage() });

// Transcribe uploaded audio (for Voice Input)
router.post('/transcribe-audio', verifyToken, upload.single('audio'), transcribeAudio);

// Transcribe existing complaint audio (Admin)
router.post('/:id/transcribe', verifyToken, transcribeComplaint);

export default router;
