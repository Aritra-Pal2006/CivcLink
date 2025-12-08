
import axios from 'axios';
import * as dotenv from 'dotenv';

dotenv.config();

const API_KEY = process.env.HUGGING_FACE_API_KEY;

const CONFIGS = [
    { url: "https://router.huggingface.co/hf-inference/models", model: "google/flan-t5-small" },
    { url: "https://router.huggingface.co/hf-inference/models", model: "facebook/opt-125m" },
];

async function testConfig(url: string, model: string) {
    console.log(`Testing URL: ${url} | Model: ${model}`);
    try {
        const response = await axios.post(
            `${url}/${model}`,
            { inputs: "Hello" },
            {
                headers: {
                    Authorization: `Bearer ${API_KEY}`,
                    "Content-Type": "application/json",
                },
            }
        );
        console.log(`✅ Success! Status: ${response.status}`);
        return true;
    } catch (error: any) {
        console.log(`❌ Failed.`);
        if (error.response) {
            console.log(`Status: ${error.response.status}`);
            console.log(`Data: ${JSON.stringify(error.response.data)}`);
        } else {
            console.log(`Error: ${error.message}`);
        }
        return false;
    }
}

async function runTests() {
    for (const config of CONFIGS) {
        if (await testConfig(config.url, config.model)) {
            console.log("Found working configuration!");
            break;
        }
    }
}

runTests();
