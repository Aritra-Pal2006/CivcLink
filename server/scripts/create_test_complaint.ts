import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const serviceAccountPath = process.env.FIREBASE_ADMIN_SDK_PATH;
if (serviceAccountPath) {
    try {
        const serviceAccount = require(path.resolve(__dirname, '..', serviceAccountPath));
        if (admin.apps.length === 0) {
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });
        }
    } catch (error) {
        console.error("Failed to load Firebase Admin SDK key:", error);
    }
}

const db = admin.firestore();

async function createTestComplaint() {
    const complaint = {
        title: "Test Escalation Complaint",
        description: "This is a test complaint to verify the escalation logic.",
        category: "Garbage",
        status: "submitted",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        userId: "test_user_123",
        location: {
            lat: 19.0760,
            lng: 72.8777,
            wardCode: "WARD_10"
        },
        escalationTriggered: false,
        isOverdue: false,
        priority: "medium"
    };

    const res = await db.collection('complaints').add(complaint);
    console.log(`Created complaint with ID: ${res.id}`);
}

createTestComplaint();
