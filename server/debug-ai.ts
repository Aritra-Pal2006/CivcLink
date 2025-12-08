
import axios from 'axios';

async function testAi() {
    try {
        console.log("Testing AI Endpoint...");
        const response = await axios.post('http://localhost:5000/api/ai/classify', {
            title: "Test Complaint",
            description: "This is a test description for the AI."
        }, {
            validateStatus: () => true // Don't throw on error status
        });

        console.log("Status:", response.status);
        console.log("Data:", response.data);
    } catch (error) {
        console.error("Request Failed:", error.message);
    }
}

testAi();
