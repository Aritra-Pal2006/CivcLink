
import { classifyWithHuggingFace } from './src/services/huggingFaceService';
import * as dotenv from 'dotenv';

dotenv.config();

async function testHF() {
    console.log("Testing Hugging Face Service...");
    try {
        const result = await classifyWithHuggingFace(
            "Broken Streetlight",
            "The streetlight on 5th Avenue has been flickering and is now completely out. It's very dark and dangerous."
        );
        console.log("✅ Hugging Face Result:", result);
    } catch (error) {
        console.error("❌ Hugging Face Failed:", error);
    }
}

testHF();
