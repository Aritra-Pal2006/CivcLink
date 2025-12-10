import { Router } from 'express';
import {
    createComplaint,
    updateComplaint,
    resolveComplaint,
    verifyComplaint,
    reopenComplaint,
    getComplaintTimeline,
    getComplaints,
    voteDispute,
    uploadCitizenProof,
    voteResolution,
    getPublicStats,
    getPublicComplaints
} from '../controllers/complaintController';

const router = Router();
import { verifyToken } from '../middleware/auth';

// PROTECTED ROUTES
router.use(verifyToken);

// Create a new complaint
router.post('/', createComplaint);

// Get complaints with filters
router.get('/', getComplaints);

// Update complaint details
router.put('/:id', updateComplaint);

// Resolve complaint (Official)
router.put('/:id/resolve', resolveComplaint);

// Verify complaint (Citizen)
router.put('/:id/verify', verifyComplaint);

// Reopen complaint (Citizen)
router.put('/:id/reopen', reopenComplaint);

// Vote Dispute (Watchdog)
router.post('/:id/vote-dispute', voteDispute);

// Upload Citizen Proof
router.put('/:id/citizen-proof', uploadCitizenProof);

// Vote on Resolution (Community Evidence)
router.post('/:id/vote-resolution', voteResolution);

// Get complaint timeline
router.get('/:id/timeline', getComplaintTimeline);

export default router;
