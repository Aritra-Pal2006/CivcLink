
const axios = require('axios');

async function testAi() {
    console.log("Starting AI Test V2...");
    try {
        console.log("Sending request to AI endpoint...");
        const res = await axios.post('http://localhost:5000/api/ai/classify', {
            title: "Broken Streetlight",
            description: "The streetlight on 5th Avenue is flickering and causing safety issues."
        }, {
            headers: {
                'Authorization': 'Bearer fake-token-123' // Middleware is active, but we want to see if it reaches AI logic
            },
            timeout: 15000 // Client timeout
        });
        console.log("Success! Response:", JSON.stringify(res.data, null, 2));
    } catch (e) {
        console.error("Test Failed:", e.message);
        if (e.response) {
            console.error("Status:", e.response.status);
            console.error("Data:", JSON.stringify(e.response.data, null, 2));
        } else if (e.request) {
            console.error("No response received (Timeout or Network Error)");
        }
    }
}

testAi();
