
const axios = require('axios');
const fs = require('fs');

async function test() {
    try {
        const url = "http://localhost:5000/api/geocode/wards?minLat=28.5&minLng=77.1&maxLat=28.7&maxLng=77.3";
        console.log("Fetching:", url);
        const res = await axios.get(url);

        console.log("Status:", res.status);
        console.log("Data Type:", typeof res.data);

        const dataStr = JSON.stringify(res.data, null, 2);
        console.log("Payload Size:", dataStr.length, "bytes");

        fs.writeFileSync('debug_wards_clean.json', dataStr);

        if (res.data.type !== 'FeatureCollection') {
            console.error("❌ Invalid GeoJSON: Missing type FeatureCollection");
        } else if (!Array.isArray(res.data.features)) {
            console.error("❌ Invalid GeoJSON: Missing features array");
        } else {
            console.log("✅ GeoJSON Structure Valid. Features count:", res.data.features.length);
            if (res.data.features.length > 0) {
                console.log("First Feature:", JSON.stringify(res.data.features[0], null, 2));
            }
        }
    } catch (e) {
        console.error("Error:", e.message);
        if (e.response) {
            console.error("Response data:", e.response.data);
        }
    }
}

test();
