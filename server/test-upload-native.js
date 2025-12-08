const fs = require('fs');
const path = require('path');

async function test() {
    const filePath = path.join(__dirname, '../frontend/src/assets/DirtyWater.png');

    if (!fs.existsSync(filePath)) {
        console.error("File not found:", filePath);
        return;
    }

    const buffer = fs.readFileSync(filePath);
    const blob = new Blob([buffer], { type: 'image/png' });
    const formData = new FormData();
    formData.append('file', blob, 'DirtyWater.png');

    console.log('Uploading DirtyWater.png via http://localhost:5000/api/upload ...');

    try {
        const res = await fetch('http://localhost:5000/api/upload', {
            method: 'POST',
            body: formData
        });

        if (!res.ok) {
            const text = await res.text();
            console.error('❌ Error:', res.status, text);
        } else {
            const json = await res.json();
            console.log('✅ Success!', json);
        }
    } catch (e) {
        console.error("❌ Network Error:", e);
    }
}
test();
