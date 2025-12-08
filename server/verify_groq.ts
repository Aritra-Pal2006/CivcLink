
import { GroqProvider } from './src/services/ai/groqProvider';
import * as dotenv from 'dotenv';

dotenv.config();

async function verifyGroq() {
    console.log("Verifying Groq API Key...");
    const provider = new GroqProvider();

    try {
        const result = await provider.classify(
            "Streetlight broken",
            "The street light outside my house is not working."
        );
        console.log("✅ Groq Success:", result);
    } catch (error: any) {
        console.error("❌ Groq Failed:", error.message);
    }
}

verifyGroq();
