
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
const auth = admin.auth();

async function createCityAdmin() {
    const email = 'city_admin@test.com';
    const password = 'password123';

    try {
        // 1. Create Auth User
        let uid;
        try {
            const userRecord = await auth.getUserByEmail(email);
            uid = userRecord.uid;
            console.log(`User ${email} already exists with UID: ${uid}`);
        } catch (error) {
            const userRecord = await auth.createUser({
                email,
                password,
                displayName: 'City Admin Test'
            });
            uid = userRecord.uid;
            console.log(`Created new user ${email} with UID: ${uid}`);
        }

        // 2. Create/Update Firestore User Document
        await db.collection('users').doc(uid).set({
            uid,
            email,
            displayName: 'City Admin Test',
            role: 'admin',
            adminLevel: 'city', // <--- KEY FIELD
            department: 'Administration',
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        console.log(`Successfully set role 'admin' and adminLevel 'city' for ${email}`);
        console.log(`Login with: ${email} / ${password}`);

    } catch (error) {
        console.error('Error creating city admin:', error);
    }
}

createCityAdmin();
