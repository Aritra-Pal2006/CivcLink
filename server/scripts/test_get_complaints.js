
const axios = require('axios');

async function testGetComplaints() {
    try {
        // UID for Ward Admin (from previous debug)
        const uid = "jVDYHwnXu9eLDHtpqGC6mNB0H9h2";

        console.log("Testing getComplaints for Ward Admin...");
        const response = await axios.get('http://localhost:5000/api/complaints', {
            headers: {
                'x-user-id': uid
            }
        });

        console.log("Status:", response.status);
        console.log("Complaints Found:", response.data.length);
        if (response.data.length > 0) {
            console.log("First Complaint Ward:", response.data[0].location?.wardCode);
        }
    } catch (error) {
        console.error("Error:", error.message);
        if (error.response) {
            console.error("Response Data:", error.response.data);
        }
    }
}

testGetComplaints();
