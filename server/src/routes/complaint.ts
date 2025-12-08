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
    getPublicStats
} from '../controllers/complaintController';

const router = Router();

// Public Stats (Must be before /:id routes if any generic ones existed, though here it's fine)
router.get('/public/stats', getPublicStats);

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
