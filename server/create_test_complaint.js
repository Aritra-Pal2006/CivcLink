
const API_URL = 'http://localhost:5001/api/complaints';

async function createComplaint() {
    console.log("Creating Test Complaint...");

    const complaint = {
        userId: "test_user_123",
        title: "Test Pothole in Mumbai",
        description: "This is a test complaint to verify state tagging.",
        category: "Roads",
        priority: "high",
        location: {
            lat: 19.0760,
            lng: 72.8777,
            address: "Mumbai, Maharashtra"
        }
    };

    try {
        const res = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(complaint)
        });

        if (res.ok) {
            const data = await res.json();
            console.log("✅ Complaint created with ID:", data.id);
        } else {
            console.error("❌ Failed to create complaint:", await res.text());
        }
    } catch (error) {
        console.error("Error:", error);
    }
}

createComplaint();
