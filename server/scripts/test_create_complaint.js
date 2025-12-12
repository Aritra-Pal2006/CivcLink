
const axios = require('axios');

async function testCreateComplaint() {
    try {
        const response = await axios.post('http://localhost:5000/api/complaints', {
            userId: 'test-user-id',
            title: 'Test Complaint',
            description: 'This is a test complaint description.',
            category: 'Roads',
            location: {
                lat: 28.6139,
                lng: 77.2090,
                address: 'New Delhi, India'
            },
            priority: 'medium',
            isAnonymous: false
        });

        console.log('Success:', response.data);
    } catch (error) {
        if (error.response) {
            console.error('Error Status:', error.response.status);
            console.error('Error Body:', error.response.data);
        } else {
            console.error('Request Failed:', error.message);
        }
    }
}

testCreateComplaint();
