
import Groq from 'groq-sdk';
import { AIProvider, AIResult, AIImageComparisonResult } from './aiProvider.interface';

export class GroqProvider implements AIProvider {
    name = 'Groq';

    async classify(title: string, description: string): Promise<AIResult> {
        const apiKey = process.env.GROQ_API_KEY;

        if (!apiKey) {
            throw new Error("Groq API Key is missing");
        }

        const groq = new Groq({ apiKey });

        const prompt = `You are an AI assistant for a civic grievance platform. Analyze the following complaint and return ONLY a valid JSON object. Do not add any explanation or markdown formatting.

Complaint Title: ${title}
Complaint Description: ${description}

Required JSON Structure:
{
  "category": "One of: Roads, Electricity, Water, Waste, Public Safety, General",
  "priority": "One of: low, medium, high, critical",
  "summary": "A concise one-sentence summary"
}
`;

        try {
            const completion = await groq.chat.completions.create({
                messages: [
                    { role: "user", content: prompt }
                ],
                model: "llama-3.1-8b-instant",
                temperature: 0.1,
                response_format: { type: "json_object" }
            });

            const generatedText = completion.choices[0]?.message?.content || "";
            const result = JSON.parse(generatedText);

            return {
                category: result.category || "General",
                priority: result.priority || "medium",
                summary: result.summary || title,
                meta: { provider: 'Groq', model: "llama-3.1-8b-instant" }
            };

        } catch (error: any) {
            console.error("Groq Error:", error.message);
            throw error;
        }
    }

    async compareImages(originalUrl: string, resolutionUrl: string): Promise<AIImageComparisonResult> {
        const apiKey = process.env.GROQ_API_KEY;
        if (!apiKey) throw new Error("Groq API Key is missing");

        const groq = new Groq({ apiKey });

        const prompt = `Compare these two images. Determine if the second image genuinely shows the resolution of the same problem shown in the first image.
        
        Respond strictly in JSON with:
        {
          "similarityScore": 0-100,
          "verdict": "LIKELY_MATCH" | "UNCERTAIN" | "LIKELY_FAKE",
          "reason": "string"
        }`;

        try {
            const completion = await groq.chat.completions.create({
                messages: [
                    {
                        role: "user",
                        content: [
                            { type: "text", text: prompt },
                            { type: "image_url", image_url: { url: originalUrl } },
                            { type: "image_url", image_url: { url: resolutionUrl } }
                        ]
                    }
                ],
                model: "llama-3.2-11b-vision-preview",
                temperature: 0.1,
                response_format: { type: "json_object" }
            });

            const generatedText = completion.choices[0]?.message?.content || "";
            const result = JSON.parse(generatedText);

            return {
                similarityScore: result.similarityScore || 0,
                verdict: result.verdict || 'UNCERTAIN',
                reason: result.reason || "AI could not determine reason"
            };
        } catch (error: any) {
            console.error("Groq Vision Error:", error.message);
            // Fallback for error
            return {
                similarityScore: 0,
                verdict: 'UNCERTAIN',
                reason: `AI Analysis Failed: ${error.message}`
            };
        }
    }
}
