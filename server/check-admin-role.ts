
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

async function checkAdminRole() {
    // CHANGE THIS EMAIL TO THE ONE YOU ARE TESTING
    const email = process.argv[2];

    if (!email) {
        console.log("Usage: npx ts-node server/check-admin-role.ts <email>");
        return;
    }

    try {
        const userRecord = await auth.getUserByEmail(email);
        const uid = userRecord.uid;
        console.log(`\n🔍 Checking User: ${email} (UID: ${uid})`);

        const userDoc = await db.collection('users').doc(uid).get();
        if (!userDoc.exists) {
            console.log("❌ User document NOT FOUND in Firestore 'users' collection.");
            return;
        }

        const data = userDoc.data();
        console.log("✅ User Data found:");
        console.log("------------------------------------------------");
        console.log(`Role:         ${data?.role}`);
        console.log(`Admin Level:  ${data?.adminLevel}  <-- Should be 'ward'`);
        console.log(`Assigned Ward:${data?.assignedWard} <-- Should be 'WARD_XX'`);
        console.log("------------------------------------------------");

        if (data?.role !== 'admin') console.warn("⚠️ WARNING: Role is not 'admin'.");
        if (data?.adminLevel !== 'ward') console.warn("⚠️ WARNING: adminLevel is not 'ward'. User might see ALL complaints.");
        if (!data?.assignedWard) console.warn("⚠️ WARNING: assignedWard is MISSING. User might see ALL complaints.");

    } catch (error) {
        console.error('Error fetching user:', error);
    }
}

checkAdminRole();
