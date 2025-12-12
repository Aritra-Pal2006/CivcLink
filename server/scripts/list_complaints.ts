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

async function listComplaints() {
    console.log("Fetching complaints...");
    const doc = await db.collection('complaints').doc('bGMnSTzlcUNPtF7sq9yh').get();

    const fs = require('fs');
    let output = '';
    if (doc.exists) {
        const data = doc.data();
        output += `ID: ${doc.id} | Status: ${data?.status} | Overdue: ${data?.isOverdue} | Escalated: ${data?.escalationTriggered} | Created: ${data?.createdAt?.toDate()}\n`;
    } else {
        output = "Complaint not found";
    }
    fs.writeFileSync('complaints_list.txt', output);
    console.log("Written to complaints_list.txt");
}

listComplaints();
