import { Router } from 'express';
import axios from 'axios';
import { verifyToken } from '../middleware/auth';
import { logActivity } from '../controllers/complaintController';
import { aiManager } from '../services/ai/aiManager';

const router = Router();

router.post('/classify', verifyToken, async (req, res) => {
    console.log("AI Request received:", req.body.title);
    const { title, description, complaintId } = req.body;
    const apiKey = process.env.AI_API_KEY;
    const apiBaseUrl = process.env.AI_API_BASE_URL;

    if (!apiKey || !apiBaseUrl) {
        return res.status(500).json({ error: 'AI Configuration missing on server' });
    }

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
        console.error("AI Error:", error.message);
        res.status(500).json({ error: "AI Analysis Failed" });
    }
});

export default router;
