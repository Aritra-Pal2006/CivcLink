
import { HfInference } from "@huggingface/inference";
import * as dotenv from 'dotenv';

dotenv.config();

const API_KEY = process.env.HUGGING_FACE_API_KEY;
const MODEL = process.env.HUGGING_FACE_MODEL || "mistralai/Mistral-7B-Instruct-v0.3";

async function verifyKey() {
    console.log(`Verifying Hugging Face Key...`);
    console.log(`Model: ${MODEL}`);

    if (!API_KEY) {
        console.error("❌ Error: HUGGING_FACE_API_KEY is missing in .env");
        return;
    }

    const hf = new HfInference(API_KEY);

    try {
        const response = await hf.textGeneration({
            model: "facebook/opt-125m",
            inputs: "Hello",
        });

        const reply = response.generated_text;
        console.log("✅ Success! API Key is valid (tested with facebook/opt-125m).");
        console.log("Response:", reply);

    } catch (error: any) {
        console.error("❌ Verification Failed:", error.message);
        if (error.response) {
            console.error("Status:", error.response.status);
        }
    }
}

verifyKey();
