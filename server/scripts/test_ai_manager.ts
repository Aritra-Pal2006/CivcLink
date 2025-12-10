import * as dotenv from 'dotenv';
import * as path from 'path';

// Load env vars from server root
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { aiManager } from '../src/services/ai/aiManager';

async function testAI() {
    console.log("Testing AI Manager...");
    try {
        const result = await aiManager.classifyComplaint(
            "Broken Street Light",
            "The street light on Main St is flickering and causing a hazard."
        );
        console.log("AI Result:", JSON.stringify(result, null, 2));
    } catch (error) {
        console.error("AI Manager Failed:", error);
    }
}

testAI();
