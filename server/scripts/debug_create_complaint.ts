
const path = require('path');
const dotenv = require('dotenv');
const admin = require('firebase-admin');

// Initialize Firebase Admin FIRST
dotenv.config({ path: path.resolve(__dirname, '../.env') });
const serviceAccountPath = process.env.FIREBASE_ADMIN_SDK_PATH; // ../service-account.json

if (serviceAccountPath) {
    try {
        // Resolve path to service-account.json
        // index.ts uses: path.resolve(__dirname, '..', serviceAccountPath) (where __dirname is src)
        // So it resolves to project_root/service-account.json

        const serviceAccount = require(path.resolve(__dirname, '../../service-account.json'));

        if (admin.apps.length === 0) {
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });
            console.log("✅ Firebase Admin initialized");
        }
    } catch (error) {
        console.error("Failed to load Firebase Admin SDK key:", error);
        process.exit(1);
    }
} else {
    console.error("FIREBASE_ADMIN_SDK_PATH not set");
    process.exit(1);
}

// NOW import the controller
// We need to use require to ensure it runs AFTER initialization
// Since the controller is written in TS, we rely on ts-node to compile it on the fly.
const { createComplaint } = require('../src/controllers/complaintController');

const req = {
    body: {
        userId: 'test-user-id',
        title: 'Debug Complaint',
        description: 'Debugging 500 error',
        category: 'Roads',
        location: {
            lat: 28.6139,
            lng: 77.2090,
            address: 'New Delhi',
            wardCode: 'WARD_1'
        },
        priority: 'medium',
        isAnonymous: false
    }
};

const res = {
    status: (code) => {
        console.log(`Response Status: ${code}`);
        return res;
    },
    json: (data) => {
        console.log('Response JSON:', data);
        return res;
    }
};

async function run() {
    try {
        await createComplaint(req, res);
    } catch (error: any) {
        console.log("ERROR_MESSAGE:", error.message);
        console.log("ERROR_DETAILS:", error.details);
    }
}

run();
