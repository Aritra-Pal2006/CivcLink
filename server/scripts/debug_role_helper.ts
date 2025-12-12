
import * as admin from 'firebase-admin';
import path from 'path';
import dotenv from 'dotenv';
import { getCurrentUserRole } from '../src/utils/roleHelper';

// Load env
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const serviceAccountPath = process.env.FIREBASE_ADMIN_SDK_PATH;

if (serviceAccountPath) {
    try {
        // Hardcoded path to ensure it works
        const serviceAccount = require('d:/iit bomaby aarohan/project/CivcLink/service-account.json');

        if (admin.apps.length === 0) {
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });
        }
    } catch (error) {
        console.error("Failed to load Firebase Admin SDK key:", error);
        process.exit(1);
    }
}

async function debugRole() {
    // Use the UID from the previous debug log (Step 353)
    const uid = "jVDYHwnXu9eLDHtpqGC6mNB0H9h2";
    console.log(`Checking role for UID: ${uid}`);

    try {
        const roleData = await getCurrentUserRole(uid);
        console.log("Role Data:", roleData);
    } catch (error) {
        console.error("Error fetching role:", error);
    }
}

debugRole();
