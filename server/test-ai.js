
const axios = require('axios');

async function test() {
    console.log("Starting test...");
    try {
        console.log("Sending request...");
        const res = await axios.post('http://localhost:5000/api/ai/classify', {
            title: "Broken Road",
            description: "There is a massive pothole on Main St."
        }, {
            headers: {
                'Authorization': 'Bearer fake-token-123'
            }
        });
        console.log("Success:", res.data);
    } catch (e) {
        console.error("Error:", e.message);
        if (e.response) {
            console.error("Response Status:", e.response.status);
            console.error("Response Data:", e.response.data);
        }
    }
}

test();
