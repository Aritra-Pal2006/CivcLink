import { Router } from 'express';
import axios from 'axios';
import { verifyToken } from '../middleware/auth';
import { logActivity } from '../controllers/complaintController';
import { aiManager } from '../services/ai/aiManager';

const router = Router();

router.post('/classify', verifyToken, async (req, res) => {
    console.log("AI Request received:", req.body.title);
    const { title, description, complaintId } = req.body;

    try {
        const result = await aiManager.classifyComplaint(title, description);

        if (complaintId) {
            await logActivity(complaintId, 'ai_analyzed', 'system', 'system', {
                summary: result.summary,
                category: result.category,
                priority: result.priority,
                meta: result.meta
            });
        }

        res.json(result);
    } catch (error: any) {
        console.error("AI Route Error:", error.message);
        // Fallback response if even aiManager fails (though it has its own fallbacks)
        res.json({
            category: 'General',
            priority: 'medium',
            summary: `(AI Unavailable) ${title}`
        });
    }
});

export default router;
