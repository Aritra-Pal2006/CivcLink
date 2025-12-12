import { Request, Response } from 'express';
import * as admin from 'firebase-admin';

// Lazy load db
const getDb = () => admin.firestore();

export const updateLocale = async (req: Request, res: Response) => {
    try {
        const { uid } = req.params;
        const { locale } = req.body;

        if (!locale) {
            return res.status(400).json({ error: 'Locale is required' });
        }

        await getDb().collection('users').doc(uid).set({
            locale: locale,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        res.status(200).json({ message: 'Locale updated successfully', locale });
    } catch (error) {
        console.error('Error updating locale:', error);
        res.status(500).json({ error: 'Failed to update locale' });
    }
};
