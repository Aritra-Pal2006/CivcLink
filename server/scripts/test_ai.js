
const fetch = require('node-fetch');

async function testAI() {
    try {
        // Need a valid token? The endpoint uses verifyToken.
        // For quick testing, we might need to bypass auth or get a token.
        // Let's check if we can mock it or if we need to login first.
        // Actually, let's try to hit the endpoint and see if it returns 401.

        const response = await fetch('http://localhost:5000/api/ai/classify', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // 'Authorization': 'Bearer ...' 
            },
            body: JSON.stringify({
                title: 'Broken Streetlight',
                description: 'The streetlight on Main St is flickering and causing issues.'
            })
        });

        if (response.status === 401) {
            console.log("Auth required. Skipping auth check for now to verify endpoint existence.");
            // To properly test, we'd need a token. 
            // But let's see if we can just check the logs if we disable auth temporarily or use a mock token if the middleware allows it?
            // The middleware likely verifies with Firebase Admin.
        }

        console.log('Status:', response.status);
        const text = await response.text();
        console.log('Body:', text);

    } catch (error) {
        console.error('Error:', error);
    }
}

testAI();
