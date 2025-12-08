import { Router } from 'express';
import axios from 'axios';

const router = Router();

router.get('/reverse', async (req, res) => {
    const { lat, lng } = req.query;
    const baseUrl = process.env.GEOCODING_BASE_URL;
    const email = process.env.GEOCODING_CONTACT_EMAIL;

    if (!lat || !lng) {
        return res.status(400).json({ error: 'Missing lat/lng' });
    }

    try {
        const response = await axios.get(`${baseUrl}/reverse`, {
            params: {
                lat,
                lon: lng,
                format: 'json',
                email // Required by Nominatim
            },
            headers: {
                'User-Agent': 'CivicLink-Local/1.0'
            }
        });

        res.json(response.data);
    } catch (error) {
        console.error("Geocoding Error:", error);
        res.status(500).json({ error: 'Geocoding failed' });
    }
});

export default router;
