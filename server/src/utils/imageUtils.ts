import axios from 'axios';
import crypto from 'crypto';

export const getImageHash = async (imageUrl: string): Promise<string> => {
    try {
        const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
        const buffer = Buffer.from(response.data, 'binary');
        const hash = crypto.createHash('sha256');
        hash.update(buffer);
        return hash.digest('hex');
    } catch (error) {
        console.error("Error hashing image:", error);
        throw new Error("Failed to generate image hash");
    }
};
