import * as admin from 'firebase-admin';
import * as path from 'path';
import * as dotenv from 'dotenv';

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
} catch (error) {
    console.error("❌ Failed to load Firebase Admin SDK key:", error);
    process.exit(1);
}

const db = admin.firestore();

async function checkUser(email: string) {
    try {
        const usersRef = db.collection('users');
        const snapshot = await usersRef.where('email', '==', email).get();

        if (snapshot.empty) {
            console.log(`❌ No user found with email: ${email}`);
            return;
        }

        const userDoc = snapshot.docs[0];
        console.log(`User: ${email}`);
        console.log(`Role: ${userDoc.data().role}`);
        console.log(`ID: ${userDoc.id}`);
    } catch (error) {
        console.error("❌ Error checking user:", error);
    }
}

const email = process.argv[2] || 'super_resolver@civic.com';
checkUser(email);
