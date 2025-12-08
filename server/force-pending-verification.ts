
import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';

dotenv.config({ path: 'server/.env' });

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(require('../service-account.json')),
        projectId: process.env.FIREBASE_PROJECT_ID || 'civiclink-61370'
    });
}

const db = admin.firestore();

async function forcePendingVerification() {
    try {
        // Get the most recent complaint
        const snapshot = await db.collection('complaints').orderBy('createdAt', 'desc').limit(1).get();
        if (snapshot.empty) {
            console.log('No complaints found.');
            return;
        }

        const doc = snapshot.docs[0];
        const deadline = new Date();
        deadline.setHours(deadline.getHours() + 48);

        await doc.ref.update({
            status: 'pending_verification',
            resolutionProof: {
                fileId: 'mock-proof-123',
                webViewLink: 'https://via.placeholder.com/600x400?text=Proof+of+Work',
                thumbnailLink: 'https://via.placeholder.com/150',
                name: 'proof.jpg',
                description: 'Forced update for testing.',
                uploadedAt: admin.firestore.FieldValue.serverTimestamp()
            },
            verificationDeadline: admin.firestore.Timestamp.fromDate(deadline)
        });

        console.log(`Updated complaint ${doc.id} to pending_verification`);
    } catch (error) {
        console.error('Error updating complaint:', error);
    }
}

forcePendingVerification();
