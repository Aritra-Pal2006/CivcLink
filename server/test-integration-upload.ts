import fs from 'fs';
import path from 'path';
import axios from 'axios';
import FormData from 'form-data';

async function test() {
    const filePath = path.join(__dirname, '../frontend/src/assets/DirtyWater.png');

    if (!fs.existsSync(filePath)) {
        console.error("❌ File not found:", filePath);
        return;
    }

    const form = new FormData();
    form.append('file', fs.createReadStream(filePath));

    console.log('Uploading DirtyWater.png via http://localhost:5000/api/upload ...');

    try {
        const res = await axios.post('http://localhost:5000/api/upload', form, {
            headers: {
                ...form.getHeaders()
            }
        });

        console.log('✅ Success!', res.data);
    } catch (err: any) {
        console.error('❌ Failed:', err.response ? err.response.data : err.message);
    }
}

test();
