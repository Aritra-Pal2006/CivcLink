import axios from 'axios';

const API_URL = 'http://localhost:5000/api/webhooks/whatsapp/twilio';

async function testWebhook() {
    console.log("🚀 Sending mock Twilio webhook to:", API_URL);

    const payload = new URLSearchParams();
    payload.append('From', 'whatsapp:+1234567890'); // Mock user
    payload.append('Body', 'Test complaint from script');
    payload.append('Latitude', '28.6139');
    payload.append('Longitude', '77.2090');

    try {
        const response = await axios.post(API_URL, payload, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'X-Twilio-Signature': 'mock-signature' // We might need to bypass validation in dev
            }
        });

        console.log("✅ Response Status:", response.status);
        console.log("✅ Response Data:", response.data);
    } catch (error) {
        console.error("❌ Error:", error.message);
        if (error.response) {
            console.error("   Status:", error.response.status);
            console.error("   Data:", error.response.data);
        }
    }
}

testWebhook();
