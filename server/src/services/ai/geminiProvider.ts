
import axios from 'axios';
import { AIProvider, AIResult, AIImageComparisonResult } from './aiProvider.interface';

export class GeminiProvider implements AIProvider {
    name = 'Gemini';

    async compareImages(originalUrl: string, resolutionUrl: string): Promise<AIImageComparisonResult> {
        return {
            similarityScore: 0,
            verdict: 'UNCERTAIN',
            reason: "Gemini Provider: compareImages not implemented."
        };
    }

    async classify(title: string, description: string): Promise<AIResult> {
        const apiKey = process.env.AI_API_KEY;
        const apiBaseUrl = process.env.AI_API_BASE_URL;

        if (!apiKey || !apiBaseUrl) {
            throw new Error('Gemini Configuration missing');
        }

        const prompt = `
        Analyze the following citizen complaint and provide a JSON response with:
        1. category: (Roads, Electricity, Water, Waste, Public Safety, General)
        2. priority: (low, medium, high, critical)
        3. summary: A one-sentence summary.

        Complaint Title: ${title}
        Complaint Description: ${description}
        `;

        try {
            const response = await axios.post(
                `${apiBaseUrl}?key=${apiKey}`,
                {
                    contents: [{ parts: [{ text: prompt }] }]
                },
                { timeout: 20000 }
            );

            const text = response.data.candidates[0].content.parts[0].text;
            const jsonMatch = text.match(/\{[\s\S]*\}/);

            if (jsonMatch) {
                const result = JSON.parse(jsonMatch[0]);
                return {
                    category: result.category,
                    priority: result.priority,
                    summary: result.summary,
                    meta: { provider: 'Gemini' }
                };
            } else {
                throw new Error("Failed to parse Gemini response");
            }
        } catch (error: any) {
            console.error("Gemini Error:", error.message);
            throw error;
        }
    }
}
