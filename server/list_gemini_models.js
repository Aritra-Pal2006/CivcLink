
const axios = require('axios');

const API_KEY = 'AIzaSyBtXCywrQPURyLCf_i-_s-oQZ4X1BkD24A';
const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

async function listModels() {
    console.log("Listing available models...");

    try {
        const response = await axios.get(`${API_URL}?key=${API_KEY}`);

        if (response.status === 200) {
            console.log("✅ Available Models:");
            const models = response.data.models.filter(m => m.supportedGenerationMethods.includes('generateContent'));
            models.forEach(m => console.log(`- ${m.name}`));
        } else {
            console.error("❌ Failed to list models:", response.status);
        }
    } catch (error) {
        console.error("❌ Error listing models:");
        if (error.response) {
            console.error(`Status: ${error.response.status}`);
            console.error(`Data: ${JSON.stringify(error.response.data, null, 2)}`);
        } else {
            console.error(error.message);
        }
    }
}

listModels();
