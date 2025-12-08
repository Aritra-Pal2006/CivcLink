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
        // Construct prompt for Gemini
        const prompt = `
        Analyze the following citizen complaint and provide a JSON response with:
        1. category: (Roads, Electricity, Water, Waste, Public Safety, General)
        2. priority: (low, medium, high, critical)
        3. summary: A one-sentence summary.

        Complaint Title: ${title}
        Complaint Description: ${description}
        `;

        const response = await axios.post(
            `${apiBaseUrl}?key=${apiKey}`,
            {
                contents: [{ parts: [{ text: prompt }] }]
            },
            { timeout: 20000 } // 20 second timeout
        );

        const text = response.data.candidates[0].content.parts[0].text;

        // Parse JSON from text (Gemini might wrap in markdown)
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const result = JSON.parse(jsonMatch[0]);

            if (complaintId) {
                await logActivity(complaintId, 'ai_analyzed', 'system', 'system', {
                    summary: result.summary,
                    category: result.category,
                    priority: result.priority
                });
            }

            res.json(result);
        } else {
            throw new Error("Failed to parse AI response");
        }

    } catch (error: any) {
        console.error("AI Error (Gemini):", error.message);

        // Fallback to Hugging Face if Gemini fails (Rate Limit 429 or Server Error 5xx)
        if (process.env.HUGGING_FACE_API_KEY) {
            try {
                console.log("Attempting fallback to Hugging Face...");
                const { classifyWithHuggingFace } = await import('../services/huggingFaceService');
                const hfResult = await classifyWithHuggingFace(title, description);

                if (complaintId) {
                    await logActivity(complaintId, 'ai_analyzed', 'system', 'system', {
                        summary: hfResult.summary,
                        category: hfResult.category,
                        priority: hfResult.priority,
                        meta: { provider: 'huggingface' }
                    });
                }

                return res.json(hfResult);
            } catch (hfError: any) {
                console.error("AI Error (Hugging Face Fallback):", hfError.message);
            }
        }

        // Final Fallback mock if both fail
        res.json({
            category: 'General',
            priority: 'medium',
            summary: `(AI Unavailable) ${title}`
        });
    }
});

export default router;
