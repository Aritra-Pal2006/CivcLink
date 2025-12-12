import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config();

// Hardcoded path to ensure it works
const serviceAccountPath = 'd:/iit bomaby aarohan/project/CivcLink/service-account.json';
const serviceAccount = require(serviceAccountPath);
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const auth = admin.auth();

async function createTempAdmin() {
    const email = 'temp_admin@civic.com';
    const password = 'password123';

    try {
        // Check if user exists
        try {
            const userRecord = await auth.getUserByEmail(email);
            console.log(`User ${email} exists. Updating password...`);
            await auth.updateUser(userRecord.uid, { password });
            await db.collection('users').doc(userRecord.uid).set({
                email,
                role: 'admin',
                adminLevel: 'city', // City admin sees all
                displayName: 'Temp Admin',
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
            console.log("User updated successfully.");
        } catch (e: any) {
            if (e.code === 'auth/user-not-found') {
                console.log(`Creating new user ${email}...`);
                const userRecord = await auth.createUser({
                    email,
                    password,
                    displayName: 'Temp Admin'
                });
                await db.collection('users').doc(userRecord.uid).set({
                    email,
                    role: 'admin',
                    adminLevel: 'city',
                    displayName: 'Temp Admin',
                    createdAt: admin.firestore.FieldValue.serverTimestamp()
                });
                console.log("User created successfully.");
            } else {
                throw e;
            }
        }
    } catch (error) {
        console.error("Error creating/updating admin:", error);
    }
}

createTempAdmin().then(() => process.exit());
