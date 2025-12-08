const http = require('http');
const querystring = require('querystring');

const postData = querystring.stringify({
    'From': 'whatsapp:+1234567890',
    'Body': 'Test complaint from script',
    'Latitude': '28.6139',
    'Longitude': '77.2090'
});

const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/webhooks/whatsapp/twilio',
    method: 'POST',
    headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData),
        'X-Twilio-Signature': 'mock-signature'
    }
};

const req = http.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    res.setEncoding('utf8');
    res.on('data', (chunk) => {
        console.log(`BODY: ${chunk}`);
    });
    res.on('end', () => {
        console.log('No more data in response.');
    });
});

req.on('error', (e) => {
    console.error(`problem with request: ${e.message}`);
});

// Write data to request body
req.write(postData);
req.end();
