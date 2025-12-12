
import express from 'express';
import aiRoutes from '../src/routes/ai';
import dotenv from 'dotenv';
import path from 'path';

// Load env
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();
app.use(express.json());

// Mock Auth Middleware
const mockVerifyToken = (req: any, res: any, next: any) => {
    console.log("Mock Auth: Bypass");
    req.user = { uid: 'test-user' };
    next();
};

// Mock the middleware import in the route? 
// It's hard to mock imports in ts-node without jest.
// Instead, let's just manually invoke the route handler if possible, or use a test server that mounts the route but we need to bypass the middleware defined IN the route file.
// The route file imports verifyToken. 

// Alternative: Create a script that calls the AI Manager directly, bypassing the route.
// This tests the logic, if not the route wiring.

import { aiManager } from '../src/services/ai/aiManager';

async function testAI() {
    console.log("Testing AI Manager directly...");
    try {
        const title = "Pothole on Main St";
        const description = "There is a large pothole causing traffic jams.";

        const result = await aiManager.classifyComplaint(title, description);
        console.log("AI Result:", JSON.stringify(result, null, 2));
    } catch (error) {
        console.error("AI Manager Error:", error);
    }
}

testAI();
