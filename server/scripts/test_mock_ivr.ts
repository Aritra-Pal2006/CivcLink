import axios from 'axios';

const BASE_URL = 'http://localhost:5000/api/mock-ivr/webhook';

async function testMockIvr() {
    console.log("🚀 Starting Mock IVR Test...");

    const callSid = `TEST_${Date.now()}`;
    const from = '+919999999999';

    // 1. Initial Call
    console.log("\n1. Simulating Incoming Call...");
    try {
        const res1 = await axios.post(BASE_URL, {
            CallSid: callSid,
            From: from,
            CallStatus: 'ringing'
        });
        console.log("Response 1:", res1.data);
    } catch (e) {
        console.error("Error 1:", e);
    }

    // 2. Press 1
    console.log("\n2. Simulating Press '1'...");
    try {
        const res2 = await axios.post(BASE_URL, {
            CallSid: callSid,
            From: from,
            Digits: '1'
        });
        console.log("Response 2:", res2.data);
    } catch (e) {
        console.error("Error 2:", e);
    }

    // 3. Send Recording
    console.log("\n3. Simulating Recording Upload...");
    try {
        const res3 = await axios.post(BASE_URL, {
            CallSid: callSid,
            From: from,
            RecordingUrl: 'https://example.com/mock-audio.wav',
            RecordingDuration: 10
        });
        console.log("Response 3:", res3.data);
    } catch (e) {
        console.error("Error 3:", e);
    }
}

testMockIvr();
