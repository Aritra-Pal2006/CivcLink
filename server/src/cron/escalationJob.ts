import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';
import { logActivity } from '../controllers/complaintController';

dotenv.config();

export const runEscalationJob = async () => {
    // Initialize Firebase if not already initialized
    if (admin.apps.length === 0) {
        try {
            const serviceAccount = require('../../service-account.json');
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });
        } catch (error) {
            console.log("Firebase init error:", error);
        }
    }

    const db = admin.firestore();

    console.log("⏳ Starting Escalation Job...");
    const now = new Date();
    const deadline = new Date(now.getTime() - 48 * 60 * 60 * 1000); // 48 hours ago

    try {
        // Query for complaints that are OPEN and OLDER than 48h and NOT YET ESCALATED
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
                priority: 'high' // Auto-bump priority
            });

            // Log activity (we can't batch logActivity easily as it's a subcollection, so we do it individually)
            // Note: In a massive scale, we'd queue these. For now, await is fine.
            await logActivity(doc.id, 'admin_updated', 'system', 'system', { reason: '48h SLA Breach' }, 'Auto-escalated to City Admin');

            count++;
        }

        await batch.commit();
        console.log(`🚀 Successfully escalated ${count} complaints.`);

    } catch (error) {
        console.error("❌ Error running escalation job:", error);
    }
};

// Allow running directly
if (require.main === module) {
    runEscalationJob().then(() => process.exit());
}
