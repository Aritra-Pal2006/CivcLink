import * as admin from 'firebase-admin';
import * as fs from 'fs';

// Initialize Firebase Admin
const serviceAccount = require('../../service-account.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function debugData() {
    let output = "--- Debugging Data ---\n";

    // 1. List all users with role 'city_admin' and their assignedCity
    output += "\n1. City Admins:\n";
    const allUsers = await db.collection('users').get();
    allUsers.docs.forEach(doc => {
        const data = doc.data();
        if (data.adminLevel === 'city') {
            output += `- User: ${data.email} (${doc.id})\n`;
            output += `  assignedCity: "${data.assignedCity}"\n`;
            output += `  adminLevel: ${data.adminLevel}\n`;
        }
    });

    // 2. List a few complaints and their location.districtName
    output += "\n2. Recent Complaints (District Check):\n";
    const complaintsSnap = await db.collection('complaints').orderBy('createdAt', 'desc').limit(10).get();
    complaintsSnap.docs.forEach(doc => {
        const data = doc.data();
        output += `- Complaint ${doc.id}:\n`;
        output += `  Title: ${data.title}\n`;
        output += `  District: "${data.location?.districtName}"\n`;
        output += `  City (if any): "${data.location?.city}"\n`;
        output += `  Ward: "${data.location?.wardCode}"\n`;
    });

    fs.writeFileSync('debug_output.txt', output);
    console.log("Debug output written to debug_output.txt");
}

debugData().catch(console.error);
