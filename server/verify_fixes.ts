import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';
import { Request, Response } from 'express';

dotenv.config();

// Initialize Firebase BEFORE importing controllers
if (admin.apps.length === 0) {
    const serviceAccount = require('../service-account.json');
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

// Mock Data
const MOCK_USER_ID = 'test_user_123';
const MOCK_ADMIN_ID = 'test_admin_123';

// Mock Express Request/Response
const mockRequest = (body: any, params: any = {}, query: any = {}) => ({
    body,
    params,
    query,
    headers: {},
    user: { uid: MOCK_ADMIN_ID }
} as unknown as Request);

const mockResponse = () => {
    const res: any = {};
    res.status = (code: number) => {
        res.statusCode = code;
        return res;
    };
    res.json = (data: any) => {
        res.data = data;
        return res;
    };
    return res;
};

async function setupTestUser() {
    await db.collection('users').doc(MOCK_ADMIN_ID).set({
        role: 'admin',
        adminLevel: 'city',
        phoneNumber: '+919999999999'
    });
    await db.collection('users').doc(MOCK_USER_ID).set({
        role: 'citizen',
        phoneNumber: '+918888888888'
    });
}

async function runTests() {
    // Dynamic Import to ensure Firebase is initialized first
    const { createComplaint, resolveComplaint, rejectComplaint } = require('./src/controllers/complaintController');

    try {
        await setupTestUser();

        console.log("🧪 Starting Verification Tests...");

        // 1. Test Duplicate Detection (Bounding Box)
        console.log("\n--- Test 1: Duplicate Detection ---");
        const loc1 = { lat: 28.6139, lng: 77.2090 }; // New Delhi

        // Create Parent
        const req1 = mockRequest({
            userId: MOCK_USER_ID,
            title: "Original Pothole",
            description: "Big pothole",
            category: "Roads",
            location: loc1,
            priority: "medium"
        });
        const res1 = mockResponse();
        await createComplaint(req1, res1);
        const parentId = res1.data?.id; // Safe access
        console.log("Parent Created:", parentId);

        if (!parentId) throw new Error("Parent creation failed");

        // Create Duplicate (Same location)
        const req2 = mockRequest({
            userId: MOCK_USER_ID,
            title: "Duplicate Pothole",
            description: "Same pothole",
            category: "Roads",
            location: loc1, // Exact same
            priority: "medium"
        });
        const res2 = mockResponse();
        await createComplaint(req2, res2);
        const childId = res2.data?.id;
        console.log("Child Created:", childId);

        if (!childId) throw new Error("Child creation failed");

        // Fetch Child to check duplicateOf
        const childDoc = await db.collection('complaints').doc(childId).get();
        if (childDoc.data()?.duplicateOf === parentId) {
            console.log("✅ Duplicate Detected Successfully!");
        } else {
            console.error("❌ Duplicate Detection Failed!", childDoc.data());
        }

        // 2. Test GPS Blocking
        console.log("\n--- Test 2: GPS Blocking ---");
        // Try to resolve Parent from far away
        const farLoc = { lat: 28.7000, lng: 77.2000 }; // Far away
        const reqResolveFail = mockRequest({
            actorId: MOCK_ADMIN_ID,
            proof: { imageUrl: "http://fake.com/img.jpg", note: "Done" },
            adminLocation: farLoc
        }, { id: parentId });
        const resResolveFail = mockResponse();

        await resolveComplaint(reqResolveFail, resResolveFail);

        if (resResolveFail.statusCode === 400 && resResolveFail.data?.error?.includes("GPS Mismatch")) {
            console.log("✅ GPS Blocking Worked! (400 Error returned)");
        } else {
            console.error("❌ GPS Blocking Failed!", resResolveFail.statusCode, resResolveFail.data);
        }

        // 3. Test Reject Flow
        console.log("\n--- Test 3: Reject Flow ---");
        const reqReject = mockRequest({
            actorId: MOCK_ADMIN_ID,
            reason: "Not a valid complaint"
        }, { id: childId }); // Reject the duplicate
        const resReject = mockResponse();

        await rejectComplaint(reqReject, resReject);

        if (resReject.data?.message === "Complaint rejected successfully") {
            const rejDoc = await db.collection('complaints').doc(childId).get();
            if (rejDoc.data()?.status === 'rejected') {
                console.log("✅ Rejection Logic Worked!");
            } else {
                console.error("❌ Rejection Status Update Failed");
            }
        } else {
            console.error("❌ Rejection Endpoint Failed", resReject.data);
        }

    } catch (error) {
        console.error("CRITICAL TEST FAILURE:", error);
    }
}

runTests().then(() => process.exit());
