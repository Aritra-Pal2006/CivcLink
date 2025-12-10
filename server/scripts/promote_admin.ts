import * as admin from 'firebase-admin';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load env vars from server root
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const serviceAccountPath = process.env.FIREBASE_ADMIN_SDK_PATH;
if (!serviceAccountPath) {
    console.error("❌ FIREBASE_ADMIN_SDK_PATH not set");
    process.exit(1);
}

try {
    const serviceAccount = require(path.resolve(__dirname, '../', serviceAccountPath));
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
    console.log("✅ Firebase Admin initialized");
} catch (error) {
    console.error("❌ Failed to load Firebase Admin SDK key:", error);
    process.exit(1);
}

const db = admin.firestore();

async function promoteUser(email: string) {
    try {
        const usersRef = db.collection('users');
        const snapshot = await usersRef.where('email', '==', email).get();

        if (snapshot.empty) {
            console.log(`❌ No user found with email: ${email}`);
            return;
        }

        const userDoc = snapshot.docs[0];
        await userDoc.ref.update({
            role: 'superadmin',
            trustScore: 100
        });

        console.log(`✅ Successfully promoted ${email} to superadmin`);
    } catch (error) {
        console.error("❌ Error promoting user:", error);
    }
}

const email = process.argv[2];
if (!email) {
    console.log("Usage: ts-node promote_admin.ts <email>");
    process.exit(1);
}

promoteUser(email);
