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
const serviceAccountPath = process.env.FIREBASE_ADMIN_SDK_PATH;
if (serviceAccountPath) {
    try {
        const serviceAccount = require(path.resolve(__dirname, '..', serviceAccountPath));
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        console.log("✅ Firebase Admin initialized");
    } catch (error) {
        console.error("❌ Failed to load Firebase Admin SDK key:", error);
    }
} else {
    console.warn("⚠️ FIREBASE_ADMIN_SDK_PATH not set. Auth verification will fail.");
}

// Import Routes
import aiRoutes from './routes/ai';
import geocodeRoutes from './routes/geocode';
import emailRoutes from './routes/email';
import complaintRoutes from './routes/complaint';

// Use Routes
app.use('/api/ai', aiRoutes);
app.use('/api/geocode', geocodeRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/complaints', complaintRoutes);
import uploadRoutes from './routes/upload';
console.log("Registering /api/upload route...");
app.use('/api/upload', uploadRoutes);

import whatsappRoutes from './routes/whatsapp';
app.use('/api/webhooks/whatsapp', whatsappRoutes);

// Health Check
app.get('/', (req, res) => {
    res.send('CivicLink Local Server is Running');
});

const PORT = process.env.SERVER_PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});
