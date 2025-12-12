import * as dotenv from 'dotenv';
import { createClient } from '@deepgram/sdk';
import path from 'path';

// Load .env from server root
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const apiKey = process.env.DEEPGRAM_API_KEY;

if (!apiKey) {
    console.error("❌ DEEPGRAM_API_KEY is missing in .env");
    process.exit(1);
}

console.log(`🔑 Testing Deepgram API Key: ${apiKey.substring(0, 5)}...`);

const deepgram = createClient(apiKey);

const audioUrl = 'https://static.deepgram.com/examples/interview_speech-analytics.wav';

async function testDeepgram() {
    try {
        console.log("🚀 Sending transcription request...");
        const { result, error } = await deepgram.listen.prerecorded.transcribeUrl(
            { url: audioUrl },
            {
                model: 'nova-3',
                smart_format: true,
            }
        );

        if (error) {
            console.error("❌ Deepgram API Error:", error);
            process.exit(1);
        }

        const transcript = result.results?.channels[0]?.alternatives[0]?.transcript;
        console.log("✅ Transcription Successful!");
        console.log("📝 Transcript Preview:", transcript?.substring(0, 100) + "...");
    } catch (err) {
        console.error("❌ Unexpected Error:", err);
    }
}

testDeepgram();
