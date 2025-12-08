
import * as dotenv from 'dotenv';
dotenv.config();

import { aiManager } from './src/services/ai/aiManager';

async function testCycling() {
    console.log("Testing AI Manager Cycling...");

    // Test Case: Normal classification
    try {
        console.log("\n--- Test 1: Real Classification ---");
        const result = await aiManager.classifyComplaint(
            "No water supply in Sector 4",
            "We have not received water for the last 2 days. Please help."
        );
        console.log("✅ Result:", result);
    } catch (error) {
        console.error("❌ Test 1 Failed:", error);
    }
}

testCycling();
