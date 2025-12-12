import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import * as admin from 'firebase-admin';
import path from 'path';

// Load env vars
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // Required for Twilio Webhooks

// Initialize Firebase Admin
// Initialize Firebase Admin
const serviceAccountPath = process.env.FIREBASE_ADMIN_SDK_PATH;
const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;

if (serviceAccountJson) {
    try {
        const serviceAccount = JSON.parse(serviceAccountJson);
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        console.log("✅ Firebase Admin initialized from ENV");
    } catch (error) {
        console.error("❌ Failed to parse FIREBASE_SERVICE_ACCOUNT:", error);
    }
} else if (serviceAccountPath) {
    try {
        const serviceAccount = require(path.resolve(__dirname, '..', serviceAccountPath));
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        console.log("✅ Firebase Admin initialized from FILE");
    } catch (error) {
        console.error("❌ Failed to load Firebase Admin SDK key:", error);
    }
} else {
    console.warn("⚠️ FIREBASE_ADMIN_SDK_PATH or FIREBASE_SERVICE_ACCOUNT not set. Auth verification will fail.");
}

// Import Routes
import { handleMockIvrWebhook } from './controllers/mockIvrController';
console.log("Registering /api/mock-ivr/webhook route...");
app.post('/api/mock-ivr/webhook', handleMockIvrWebhook);

import aiRoutes from './routes/ai';
import geocodeRoutes from './routes/geocode';
import emailRoutes from './routes/email';
import complaintRoutes from './routes/complaint';

// Use Routes
app.use('/api/ai', aiRoutes);
app.use('/api/geocode', geocodeRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/complaints', complaintRoutes);
import userRoutes from './routes/user';
app.use('/api/users', userRoutes);
import uploadRoutes from './routes/upload';
console.log("Registering /api/upload route...");
app.use('/api/upload', uploadRoutes);


import whatsappRoutes from './routes/whatsapp';
app.use('/api/webhooks/whatsapp', whatsappRoutes);

import { runEscalationJob } from './cron/escalationJob';

// Vercel Cron Endpoint
app.get('/api/cron/escalate', async (req, res) => {
    // Basic security check: Vercel sends this header
    // You can also add a secret key check if needed
    console.log("⏳ Triggering Escalation Job via Cron...");
    await runEscalationJob();
    res.status(200).json({ success: true, message: 'Escalation job triggered' });
});

// Run Escalation Job every hour (Local Development Only)
if (process.env.NODE_ENV !== 'production') {
    setInterval(() => {
        runEscalationJob();
    }, 60 * 60 * 1000);
    // Run once on startup to catch up
    runEscalationJob();
}

// Serve static files from the React frontend app
// Serve static files from the React frontend app
// In production (dist/src/index.js), we need to go up 3 levels to get to root: ../../../frontend/dist
// In development (src/index.ts), we need to go up 2 levels: ../../frontend/dist
const frontendPath = path.join(__dirname, __dirname.includes('dist') ? '../../../frontend/dist' : '../../frontend/dist');
app.use(express.static(frontendPath));

// Health Check (API only)
app.get('/api/health', (req, res) => {
    res.send('CivicLink API is Running');
});

// Anything that doesn't match the above, send back index.html
app.get('*', (req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
});

const PORT = process.env.PORT || process.env.SERVER_PORT || 5000;

// Always listen (Render needs this). Vercel uses api/index.ts so this file isn't the entry point there.
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});

export default app;
