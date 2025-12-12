import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Initialize Firebase
if (admin.apps.length === 0) {
    const serviceAccountPath = process.env.FIREBASE_ADMIN_SDK_PATH;
    if (!serviceAccountPath) {
        console.error("❌ FIREBASE_ADMIN_SDK_PATH not set in .env");
        process.exit(1);
    }
    const serviceAccount = require(path.resolve(__dirname, '..', serviceAccountPath));
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

const simulateOverdue = async (complaintId: string) => {
    if (!complaintId) {
        console.error("❌ Please provide a complaint ID as an argument.");
        console.log("Usage: ts-node scripts/simulate_overdue_complaint.ts <COMPLAINT_ID>");
        process.exit(1);
    }

    console.log(`⏳ Aging complaint ${complaintId} to be 50 hours old...`);

    try {
        const docRef = db.collection('complaints').doc(complaintId);
        const doc = await docRef.get();

        if (!doc.exists) {
            console.error("❌ Complaint not found!");
            process.exit(1);
        }

        const oldDate = new Date();
        oldDate.setHours(oldDate.getHours() - 50); // 50 hours ago

        await docRef.update({
            createdAt: admin.firestore.Timestamp.fromDate(oldDate),
            escalationTriggered: false // Reset this just in case
        });

        console.log(`✅ Complaint ${complaintId} is now overdue (created at ${oldDate.toISOString()}).`);
        console.log("👉 Now run: npm run escalate");

    } catch (error) {
        console.error("❌ Error updating complaint:", error);
    }
};

const args = process.argv.slice(2);
simulateOverdue(args[0]);
