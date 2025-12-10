import axios from 'axios';

async function verifyPublicApi() {
    const urls = [
        'http://localhost:5000/api/public/stats',
        'http://localhost:5000/api/complaints/public/stats'
    ];

    for (const url of urls) {
        try {
            console.log(`Testing ${url}...`);
            const res = await axios.get(url);
            console.log(`✅ Success: ${url} - Status: ${res.status}`);
            console.log('Data:', JSON.stringify(res.data, null, 2));
        } catch (error: any) {
            console.log(`❌ Failed: ${url} - Status: ${error.response ? error.response.status : error.message}`);
        }
        await new Promise(r => setTimeout(r, 1000));
    }
}

verifyPublicApi();
