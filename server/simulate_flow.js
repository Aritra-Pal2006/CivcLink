const axios = require('axios');

const WEBHOOK_URL = 'http://localhost:5000/api/webhooks/whatsapp/twilio';
const FROM_NUMBER = 'whatsapp:+919999999999'; // Test number

async function sendMsg(body, lat = null, lng = null) {
    try {
        const payload = {
            From: FROM_NUMBER,
            Body: body,
        };
        if (lat) {
            payload.Latitude = lat;
            payload.Longitude = lng;
        }

        console.log(`\n📤 Sending: "${body || '[Location]'}"`);
        await axios.post(WEBHOOK_URL, payload, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });
        console.log("✅ Sent.");
        // Wait a bit for server to process and "reply" (logs will show reply)
        await new Promise(r => setTimeout(r, 2000));
    } catch (e) {
        console.error("❌ Error:", e.message);
    }
}

async function runSimulation() {
    console.log("🚀 Starting WhatsApp Flow Simulation...");

    // 1. Reset
    await sendMsg("Reset");

    // 2. Start
    await sendMsg("Hi");

    // 3. Title
    await sendMsg("Broken Traffic Light");

    // 4. Description
    await sendMsg("The red light is stuck on at the main intersection.");

    // 5. Location
    await sendMsg("", "12.9716", "77.5946");

    console.log("🏁 Simulation Complete. Check server logs for replies.");
}

runSimulation();
