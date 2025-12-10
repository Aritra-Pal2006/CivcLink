
import * as admin from 'firebase-admin';
import * as path from 'path';

// Initialize Firebase Admin
if (!admin.apps.length) {
    const serviceAccountPath = path.resolve(__dirname, '../../service-account.json');
    const serviceAccount = require(serviceAccountPath);
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function testQueries() {
    console.log("Testing Firestore Queries...");

    try {
        // Test 1: City Admin Query
        console.log("\n--- Testing City Admin Query (location.city only) ---");
        const cityQuery = db.collection('complaints')
            .where('location.city', '==', 'Test City');

        await cityQuery.get();
        console.log("✅ City Admin Query Passed");
    } catch (error: any) {
        console.error("❌ City Admin Query Failed:", error.message);
    }

    try {
        // Test 2: Ward Admin Query
        console.log("\n--- Testing Ward Admin Query (location.wardCode only) ---");
        const wardQuery = db.collection('complaints')
            .where('location.wardCode', '==', 'W01');

        await wardQuery.get();
        console.log("✅ Ward Admin Query Passed");
    } catch (error: any) {
        console.error("❌ Ward Admin Query Failed:", error.message);
    }

    try {
        // Test 3: Dept Admin Query
        console.log("\n--- Testing Dept Admin Query (category only) ---");
        const deptQuery = db.collection('complaints')
            .where('category', '==', 'Roads');

        await deptQuery.get();
        console.log("✅ Dept Admin Query Passed");
    } catch (error: any) {
        console.error("❌ Dept Admin Query Failed:", error.message);
    }
}

testQueries().then(() => process.exit());
