
// This script is intended to be run manually or via a command that pipes output.
// It imports the app and starts listening, similar to index.ts but for debugging.
// However, since we can't easily attach to the running server process to see its console logs 
// (unless we restart it and pipe output), we will create a standalone script that 
// invokes the controller function directly, mocking the request/response.

// import { getComplaints } from '../src/controllers/complaintController';
import { Request, Response } from 'express';
import * as admin from 'firebase-admin';
import path from 'path';
import dotenv from 'dotenv';

// Load env
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Init Firebase
const serviceAccountPath = process.env.FIREBASE_ADMIN_SDK_PATH;
if (serviceAccountPath) {
    try {
        const serviceAccount = require('d:/iit bomaby aarohan/project/CivcLink/service-account.json');
        if (admin.apps.length === 0) {
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });
        }
    } catch (error) {
        console.error("Failed to load Firebase Admin SDK key:", error);
    }
}

// Import controller AFTER firebase init to avoid early db access if controller has top-level db init
// But controller imports `db` from `../index` usually or initializes it.
// Let's check controller imports.
// It imports `db` from `../index`? No, usually it uses `admin.firestore()`.
// If `complaintController` imports `db` from a file that does `admin.firestore()`, that file runs at import time.
// So we need to init firebase BEFORE importing controller.

// Dynamic import to ensure firebase is ready
async function debugGetComplaints() {
    const { getComplaints } = require('../src/controllers/complaintController');

    // Mock roleHelper to return Ward Admin data
    const roleHelper = require('../src/utils/roleHelper');
    roleHelper.getCurrentUserRole = async () => ({
        uid: 'jVDYHwnXu9eLDHtpqGC6mNB0H9h2',
        role: 'admin',
        adminLevel: 'ward',
        assignedWard: 'WARD_10'
    });

    const req = {
        headers: {
            'x-user-id': 'jVDYHwnXu9eLDHtpqGC6mNB0H9h2' // Ward Admin UID
        },
        query: {
            // Simulate query params if needed
        },
        user: {
            uid: 'jVDYHwnXu9eLDHtpqGC6mNB0H9h2'
        }
    } as unknown as Request;

    const res = {
        status: (code: number) => {
            console.log(`Response Status: ${code}`);
            return res;
        },
        json: (data: any) => {
            console.log("Response JSON:", JSON.stringify(data, null, 2));
            return res;
        }
    } as unknown as Response;

    try {
        await getComplaints(req, res);
    } catch (error) {
        console.error("Unhandled Error:", error);
    }
}

debugGetComplaints();
