
const fetch = require('node-fetch'); // Ensure node-fetch is available or use built-in fetch in Node 18+

const API_URL = 'http://localhost:5000/api/webhooks/whatsapp/twilio';

async function testWhatsappWebhook() {
    console.log("Simulating Incoming WhatsApp Message...");

    // Mock Twilio Webhook Payload
    const payload = new URLSearchParams();
    payload.append('From', 'whatsapp:+919999999999'); // Test Indian number
    payload.append('Body', 'Pothole reported via script');
    payload.append('Latitude', '12.9716'); // Bangalore
    payload.append('Longitude', '77.5946');

    try {
        const res = await fetch(API_URL, {
            method: 'POST',
            body: payload, // Twilio sends form-urlencoded
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });

        const text = await res.text();
        console.log(`Response Status: ${res.status}`);
        console.log(`Response Body: ${text}`);

        if (res.ok) {
            console.log("✅ Webhook processed successfully!");
            console.log("Check your Firestore 'complaints' collection for a new complaint from +919999999999.");
        } else {
            console.error("❌ Webhook failed.");
        }
    } catch (error) {
        console.error("Error:", error);
    }
}

testWhatsappWebhook();
