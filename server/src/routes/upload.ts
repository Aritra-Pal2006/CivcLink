import { Router } from 'express';
import { createClient } from '@supabase/supabase-js';
import fileUpload from 'express-fileupload';

const router = Router();
console.log("Upload router loaded");

// Initialize Supabase
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://cgfqkysnvfdlzeoamkon.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNnZnFreXNudmZkbHplb2Fta29uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUwMDA1NjEsImV4cCI6MjA4MDU3NjU2MX0.kf_9MkTuEIy2zfJ6HXBeoyKmlGQpmS6ynnYBCDnCZ_c';
const STORAGE_BUCKET = process.env.STORAGE_BUCKET || 'Complaints';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Use fileUpload middleware locally for this route
router.use(fileUpload());

router.post('/', async (req, res) => {
    try {
        if (!req.files || !(req.files as any).file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const file = (req.files as any).file as fileUpload.UploadedFile;
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `uploads/${fileName}`;

        console.log(`Uploading ${fileName} to ${STORAGE_BUCKET}...`);

        const { data, error } = await supabase.storage
            .from(STORAGE_BUCKET)
            .upload(filePath, file.data, {
                contentType: file.mimetype,
                upsert: false
            });

        if (error) {
            console.error('Supabase Upload Error:', error);
            throw error;
        }

        // Get Public URL
        const { data: publicUrlData } = supabase.storage
            .from(STORAGE_BUCKET)
            .getPublicUrl(filePath);

        const publicUrl = publicUrlData.publicUrl;

        console.log('Upload successful:', publicUrl);

        res.json({
            success: true,
            url: publicUrl,
            name: file.name,
            fileId: fileName
        });

    } catch (error: any) {
        console.error('Upload Route Error:', error);
        res.status(500).json({ error: error.message || 'File upload failed' });
    }
});

export default router;
