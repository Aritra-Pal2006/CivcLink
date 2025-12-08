
import { HfInference } from "@huggingface/inference";
import { AIProvider, AIResult, AIImageComparisonResult } from './aiProvider.interface';

export class HuggingFaceProvider implements AIProvider {
    name = 'HuggingFace';

    async classify(title: string, description: string): Promise<AIResult> {
        const apiKey = process.env.HUGGING_FACE_API_KEY;
        const model = process.env.HUGGING_FACE_MODEL || "mistralai/Mistral-7B-Instruct-v0.3";

        if (!apiKey) {
            throw new Error("Hugging Face API Key is missing");
        }

        const hf = new HfInference(apiKey);

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
            const response = await hf.chatCompletion({
                model: model,
                messages: [
                    { role: "user", content: prompt }
                ],
                max_tokens: 150,
                temperature: 0.1
            });

            const generatedText = response.choices[0]?.message?.content || "";
            const jsonMatch = generatedText.match(/\{[\s\S]*\}/);

            if (jsonMatch) {
                const result = JSON.parse(jsonMatch[0]);
                return {
                    category: result.category || "General",
                    priority: result.priority || "medium",
                    summary: result.summary || title,
                    meta: { provider: 'HuggingFace', model: model }
                };
            } else {
                throw new Error("Failed to parse Hugging Face response");
            }

        } catch (error: any) {
            console.error("Hugging Face Error:", error.message);
            throw error;
        }
    }

    async compareImages(originalUrl: string, resolutionUrl: string): Promise<AIImageComparisonResult> {
        // HuggingFace Inference API for Vision is limited. 
        // We will return a fallback or use a specific model if available.
        // For now, we will return UNCERTAIN as HF vision support via free API is flaky.
        // Ideally we would use a model like "qwen/Qwen-VL-Chat" if supported.

        console.warn("HuggingFace Provider: compareImages not fully implemented (Vision API limitations). Returning UNCERTAIN.");

        return {
            similarityScore: 0,
            verdict: 'UNCERTAIN',
            reason: "HuggingFace Vision API not configured or supported for this operation."
        };
    }
}
