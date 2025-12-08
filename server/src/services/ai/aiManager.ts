
import { AIProvider, AIResult, AIImageComparisonResult } from './aiProvider.interface';
import { GeminiProvider } from './geminiProvider';
import { HuggingFaceProvider } from './huggingFaceProvider';
import { GroqProvider } from './groqProvider';

export class AIManager {
    private providers: AIProvider[] = [];

    constructor() {
        // Order defines priority: Gemini -> Groq -> HuggingFace
        if (process.env.AI_API_KEY) this.providers.push(new GeminiProvider());
        if (process.env.GROQ_API_KEY) this.providers.push(new GroqProvider());
        if (process.env.HUGGING_FACE_API_KEY) this.providers.push(new HuggingFaceProvider());
    }

    async classifyComplaint(title: string, description: string): Promise<AIResult> {
        if (this.providers.length === 0) {
            console.warn("No AI Providers configured.");
            return this.getFallbackResult(title);
        }

        for (const provider of this.providers) {
            try {
                console.log(`Attempting AI analysis with ${provider.name}...`);
                const result = await provider.classify(title, description);
                console.log(`✅ ${provider.name} Success`);
                return result;
            } catch (error: any) {
                console.warn(`⚠️ ${provider.name} Failed: ${error.message}. Cycling to next provider...`);
                // Continue to next provider
            }
        }

        console.error("❌ All AI Providers failed.");
        return this.getFallbackResult(title);
    }

    async compareImages(originalUrl: string, resolutionUrl: string): Promise<AIImageComparisonResult> {
        if (this.providers.length === 0) {
            console.warn("No AI Providers configured.");
            return this.getFallbackComparisonResult();
        }

        for (const provider of this.providers) {
            try {
                console.log(`Attempting AI Image Comparison with ${provider.name}...`);
                const result = await provider.compareImages(originalUrl, resolutionUrl);
                console.log(`✅ ${provider.name} Comparison Success`);
                return result;
            } catch (error: any) {
                console.warn(`⚠️ ${provider.name} Comparison Failed: ${error.message}. Cycling to next provider...`);
                // Continue to next provider
            }
        }

        console.error("❌ All AI Providers failed comparison.");
        return this.getFallbackComparisonResult();
    }

    private getFallbackResult(title: string): AIResult {
        return {
            category: 'General',
            priority: 'medium',
            summary: `(AI Unavailable) ${title}`,
            meta: { provider: 'Fallback' }
        };
    }

    private getFallbackComparisonResult(): AIImageComparisonResult {
        return {
            similarityScore: 0,
            verdict: 'UNCERTAIN',
            reason: "AI Service Unavailable or Failed"
        };
    }
}

export const aiManager = new AIManager();
