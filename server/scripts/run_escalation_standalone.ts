import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Initialize Firebase
if (admin.apps.length === 0) {
    try {
        const serviceAccountPath = process.env.FIREBASE_ADMIN_SDK_PATH;
        if (!serviceAccountPath) {
            console.error("FIREBASE_ADMIN_SDK_PATH not set");
            process.exit(1);
        }
        const serviceAccount = require(path.resolve(__dirname, '..', serviceAccountPath));
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
    } catch (error) {
        console.error("Firebase init failed:", error);
    }
}

const db = admin.firestore();

const runEscalation = async () => {
    console.log("⏳ Starting Standalone Escalation Job...");
    const now = new Date();
    const deadline = new Date(now.getTime() - 48 * 60 * 60 * 1000); // 48 hours ago

    try {
        const snapshot = await db.collection('complaints')
            .where('status', 'in', ['submitted', 'in_progress', 'reopened'])
            .where('createdAt', '<=', admin.firestore.Timestamp.fromDate(deadline))
            .where('escalationTriggered', '==', false)
            .get();

        if (snapshot.empty) {
            console.log("✅ No complaints to escalate.");
            return;
        }

        console.log(`⚠️ Found ${snapshot.size} complaints to escalate.`);

        const batch = db.batch();
        let count = 0;

        for (const doc of snapshot.docs) {
            const ref = doc.ref;
            batch.update(ref, {
                isOverdue: true,
                escalationTriggered: true,
                escalatedAt: admin.firestore.FieldValue.serverTimestamp(),
                priority: 'high'
            });

            // Manual log activity
            const activityRef = db.collection(`complaints/${doc.id}/complaintActivity`).doc();
            batch.set(activityRef, {
                type: 'admin_updated',
                actorId: 'system',
                actorRole: 'system',
                note: 'Auto-escalated to City Admin',
                meta: { reason: '48h SLA Breach' },
                timestamp: admin.firestore.FieldValue.serverTimestamp()
            });

            count++;
        }

        await batch.commit();
        console.log(`🚀 Successfully escalated ${count} complaints.`);

    } catch (error) {
        console.error("❌ Error running escalation:", error);
    }
};

runEscalation();
