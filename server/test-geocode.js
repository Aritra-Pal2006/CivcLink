
const axios = require('axios');

async function testGeocode() {
    try {
        console.log("Testing Geocode Endpoint...");
        // Test with coordinates for New Delhi
        const res = await axios.get('http://localhost:5000/api/geocode/reverse?lat=28.6139&lng=77.2090');
        console.log("Status:", res.status);
        console.log("Address:", res.data.display_name);
    } catch (e) {
        console.error("Geocode Error:", e.message);
        if (e.response) {
            console.error("Response:", e.response.data);
        }
    }
}

testGeocode();
