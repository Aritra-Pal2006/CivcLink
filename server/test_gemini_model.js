
const axios = require('axios');

const API_KEY = 'AIzaSyBtXCywrQPURyLCf_i-_s-oQZ4X1BkD24A';
// Switching to gemini-1.5-flash which usually has better availability/limits
const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

async function testGemini() {
    console.log("Testing Gemini 1.5 Flash with new Key...");

    try {
        const response = await axios.post(
            `${API_URL}?key=${API_KEY}`,
            {
                contents: [{ parts: [{ text: "Hello, are you working?" }] }]
            }
        );

        if (response.status === 200) {
            console.log("✅ Gemini 1.5 Flash is WORKING!");
            console.log("Response:", response.data.candidates[0].content.parts[0].text);
        } else {
            console.error("❌ Gemini API returned status:", response.status);
        }
    } catch (error) {
        console.error("❌ Gemini API Failed:");
        if (error.response) {
            console.error(`Status: ${error.response.status}`);
            console.error(`Data: ${JSON.stringify(error.response.data, null, 2)}`);
        } else {
            console.error(error.message);
        }
    }
}

testGemini();
