import * as admin from 'firebase-admin';

// Initialize Firebase Admin
const serviceAccount = require('../../service-account.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function createMumbaiComplaint() {
    console.log("Creating test complaint for Mumbai...");

    const complaintData = {
        userId: "test_user_mumbai",
        title: "Pothole in Bandra",
        description: "Large pothole causing traffic near Bandra station.",
        category: "Roads",
        location: {
            lat: 19.0596,
            lng: 72.8295,
            address: "Bandra West, Mumbai, Maharashtra",
            districtName: "MumbaiSuburban",
            city: "Mumbai",
            stateName: "Maharashtra",
            wardCode: "WARD_5"
        },
        priority: "medium",
        status: "submitted",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        upvotes: 0,
        isAnonymous: false,
        supportCount: 1
    };

    const res = await db.collection('complaints').add(complaintData);
    console.log(`✅ Created complaint ${res.id} in Mumbai.`);
}

createMumbaiComplaint().catch(console.error);
