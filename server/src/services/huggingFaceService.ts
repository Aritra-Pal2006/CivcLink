
import { HfInference } from "@huggingface/inference";

interface AIResult {
    category: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    summary: string;
}

export const classifyWithHuggingFace = async (title: string, description: string): Promise<AIResult> => {
    const apiKey = process.env.HUGGING_FACE_API_KEY;
    const model = process.env.HUGGING_FACE_MODEL || "mistralai/Mistral-7B-Instruct-v0.3";

    if (!apiKey) {
        throw new Error("Hugging Face API Key is missing");
    }

    console.log(`Fallback: Using Hugging Face model ${model}`);

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
        // We use chatCompletion as it supports most modern instruction-tuned models
        const response = await hf.chatCompletion({
            model: model,
            messages: [
                { role: "user", content: prompt }
            ],
            max_tokens: 150,
            temperature: 0.1
        });

        const generatedText = response.choices[0]?.message?.content || "";

        // Extract JSON from the response
        const jsonMatch = generatedText.match(/\{[\s\S]*\}/);

        if (jsonMatch) {
            const result = JSON.parse(jsonMatch[0]);
            return {
                category: result.category || "General",
                priority: result.priority || "medium",
                summary: result.summary || title
            };
        } else {
            console.warn("HF Response parsing failed, raw text:", generatedText);
            return {
                category: "General",
                priority: "medium",
                summary: title
            };
        }

    } catch (error) {
        console.error("Hugging Face API Error:", error);
        throw error;
    }
};
