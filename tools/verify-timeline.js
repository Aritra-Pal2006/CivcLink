const axios = require('axios');

const API_URL = 'http://localhost:5000/api';

async function runVerification() {
    try {
        console.log("1. Creating Complaint...");
        const createRes = await axios.post(`${API_URL}/complaints`, {
            userId: 'test-user-123',
            title: 'Test Complaint for Timeline',
            description: 'Testing the timeline feature',
            category: 'Roads',
            location: { lat: 10, lng: 10, address: '123 Test St' },
            priority: 'medium'
        });
        const complaintId = createRes.data.id;
        console.log("   Complaint Created:", complaintId);

        console.log("2. Fetching Timeline (Initial)...");
        const timeline1 = await axios.get(`${API_URL}/complaints/${complaintId}/timeline`);
        console.log("   Timeline entries:", timeline1.data.length);
        if (timeline1.data.length > 0 && timeline1.data[0].type === 'created') {
            console.log("   ✅ 'created' event found");
        } else {
            console.error("   ❌ 'created' event MISSING");
        }

        console.log("3. Updating Complaint (Admin)...");
        await axios.put(`${API_URL}/complaints/${complaintId}`, {
            priority: 'high',
            actorId: 'admin-1',
            actorRole: 'official'
        });
        console.log("   Complaint Updated");

        console.log("4. Fetching Timeline (After Update)...");
        const timeline2 = await axios.get(`${API_URL}/complaints/${complaintId}/timeline`);
        console.log("   Timeline entries:", timeline2.data.length);
        const updateEvent = timeline2.data.find(e => e.type === 'admin_updated');
        if (updateEvent) {
            console.log("   ✅ 'admin_updated' event found");
        } else {
            console.error("   ❌ 'admin_updated' event MISSING");
        }

        console.log("5. Testing Filters (High Priority)...");
        const filtered = await axios.get(`${API_URL}/complaints?priority=high`);
        const found = filtered.data.find(c => c.id === complaintId);
        if (found) {
            console.log("   ✅ Created complaint found in high priority filter");
        } else {
            console.error("   ❌ Created complaint NOT found in high priority filter");
        }

        console.log("6. Testing AI Log (Simulated)...");
        // Simulate AI call with complaintId
        await axios.post(`${API_URL}/ai/classify`, {
            title: 'Test Complaint',
            description: 'Testing AI log',
            complaintId: complaintId
        });

        const timeline3 = await axios.get(`${API_URL}/complaints/${complaintId}/timeline`);
        const aiEvent = timeline3.data.find(e => e.type === 'ai_analyzed');
        if (aiEvent) {
            console.log("   ✅ 'ai_analyzed' event found");
        } else {
            console.error("   ❌ 'ai_analyzed' event MISSING");
        }

        console.log("\nVerification Complete!");

    } catch (error) {
        console.error("Verification Failed:", error.response ? error.response.data : error.message);
    }
}

runVerification();
