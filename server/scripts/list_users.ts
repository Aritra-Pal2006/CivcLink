
import * as admin from 'firebase-admin';
import path from 'path';
import dotenv from 'dotenv';

// Load env
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const serviceAccountPath = process.env.FIREBASE_ADMIN_SDK_PATH;

if (serviceAccountPath) {
    try {
        const serviceAccount = require(path.resolve(__dirname, '../../service-account.json'));

        if (admin.apps.length === 0) {
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });
        }
    } catch (error) {
        console.error("Failed to load Firebase Admin SDK key:", error);
        process.exit(1);
    }
}

const db = admin.firestore();

async function listUsers() {
    console.log("Listing users...");
    const snapshot = await db.collection('users').get();
    snapshot.forEach(doc => {
        const data = doc.data();
        console.log(`User: ${doc.id}, Role: ${data.role}, AdminLevel: ${data.adminLevel}, Ward: ${data.assignedWard}, Email: ${data.email}`);
    });
}

listUsers();
