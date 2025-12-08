
import { HfInference } from "@huggingface/inference";
import * as dotenv from 'dotenv';

dotenv.config();

const HF_TOKEN = process.env.HUGGING_FACE_API_KEY;
const hf = new HfInference(HF_TOKEN);

async function testSDK() {
    console.log("Testing with @huggingface/inference SDK...");
    try {
        const result = await hf.chatCompletion({
            model: 'HuggingFaceH4/zephyr-7b-beta',
            messages: [{ role: "user", content: "Hello world" }],
            max_tokens: 50
        });
        console.log("✅ SDK Success:", result);
    } catch (error: any) {
        console.error("❌ SDK Failed:", error.message);
        if (error.response) {
            console.error("Status:", error.response.status);
        }
    }
}

testSDK();
