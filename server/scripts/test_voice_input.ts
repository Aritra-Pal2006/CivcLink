import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';
import * as admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Initialize Firebase Admin to get a token
const serviceAccountPath = process.env.FIREBASE_ADMIN_SDK_PATH;
if (!serviceAccountPath) {
    console.error("FIREBASE_ADMIN_SDK_PATH not set");
    process.exit(1);
}
const serviceAccount = require(path.resolve(__dirname, '..', serviceAccountPath));

if (admin.apps.length === 0) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const API_URL = 'http://localhost:5000/api/complaints/transcribe-audio';

async function testVoiceInput() {
    try {
        // 1. Get a valid ID token (using a custom token for simplicity, or just mocking if verifyToken allows)
        // Since verifyToken verifies ID tokens, we need a real one. 
        // For testing, we can generate a custom token and exchange it? No, that requires client SDK.
        // We'll assume we can skip auth or use a known user's token if we had one.
        // Actually, let's try to hit it without auth first to see if we get 401.
        // Or we can temporarily disable auth in the route for testing.

        // Better: Create a dummy file
        const form = new FormData();
        form.append('audio', Buffer.from('fake audio content'), {
            filename: 'test.webm',
            contentType: 'audio/webm',
        });

        console.log("Sending request to:", API_URL);

        // We need a token. If we can't get one easily, we might need to rely on the user.
        // But wait, I can use the `test_deepgram.ts` approach but targeting the local server.

        // Let's try to get a custom token and see if the server accepts it? 
        // verifyToken uses admin.auth().verifyIdToken(token). Custom tokens are different.
        // We need an ID token.

        // ALTERNATIVE: I will check the logs from the user's attempt first.

    } catch (error: any) {
        console.error("Test failed:", error.response ? error.response.data : error.message);
    }
}

// testVoiceInput();
