import { analyzeComplaint } from './functions/src/ai';
import dotenv from 'dotenv';

dotenv.config({ path: './functions/.env' });

async function testAI() {
    console.log("Testing AI with key:", process.env.GEMINI_API_KEY ? "Present" : "Missing");

    const title = "Broken Streetlight";
    const description = "The streetlight is flickering and it is very dark and unsafe.";

    try {
        const result = await analyzeComplaint(title, description);
        console.log("AI Result:", JSON.stringify(result, null, 2));
    } catch (error) {
        console.error("AI Test Failed:", error);
    }
}

testAI();
