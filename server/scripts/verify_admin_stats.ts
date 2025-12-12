
import * as admin from 'firebase-admin';

// Initialize Firebase FIRST
if (admin.apps.length === 0) {
    admin.initializeApp({
        credential: admin.credential.cert(require('../../service-account.json'))
    });
}

const db = admin.firestore();

// Mock Request/Response
const mockRes = () => {
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

async function verify() {
    console.log("Verifying Admin Stats & Map Data...");

    // 1. Find a City Admin (Mumbai)
    const userSnap = await db.collection('users')
        .where('adminLevel', '==', 'city')
        .where('assignedCity', '==', 'Mumbai')
        .limit(1)
        .get();

    if (userSnap.empty) {
        console.error("No Mumbai City Admin found!");
        return;
    }

    const adminUser = userSnap.docs[0];
    const adminId = adminUser.id;
    console.log(`Found Mumbai Admin: ${adminUser.data().email} (${adminId})`);

    // Mock Deepgram Key to avoid crash
    process.env.DEEPGRAM_API_KEY = 'dummy_key_for_test';

    // Dynamic Import to ensure Firebase is init
    const { getAdminStats, getComplaints } = require('../src/controllers/complaintController');

    // 2. Call getAdminStats
    const reqStats: any = {
        user: { uid: adminId },
        headers: { 'x-user-id': adminId },
        query: {}
    };
    const resStats = mockRes();

    await getAdminStats(reqStats, resStats);
    console.log("Stats Response:", resStats.data);

    // 3. Call getComplaints (Map Data)
    const reqMap: any = {
        user: { uid: adminId },
        headers: { 'x-user-id': adminId },
        query: { limit: '100' }
    };
    const resMap = mockRes();

    await getComplaints(reqMap, resMap);
    const complaints = resMap.data;
    console.log(`Map Data Count: ${complaints.length}`);

    // 4. Verify Map Data Location
    const nonMumbai = complaints.filter((c: any) =>
        c.location.districtName !== 'Mumbai City' &&
        c.location.districtName !== 'MumbaiSuburban'
    );

    if (nonMumbai.length > 0) {
        console.error("❌ ERROR: Found non-Mumbai complaints in map data:", nonMumbai.map((c: any) => c.location.districtName));
    } else {
        console.log("✅ SUCCESS: All map complaints are from Mumbai.");
    }

    // 5. Verify Stats Match
    if (resStats.data.total !== complaints.length) {
        console.warn(`⚠️ NOTE: Stats total (${resStats.data.total}) differs from Map count (${complaints.length}). This is expected if total > 100.`);
    } else {
        console.log("✅ SUCCESS: Stats total matches Map count.");
    }
}

verify().catch(console.error);
