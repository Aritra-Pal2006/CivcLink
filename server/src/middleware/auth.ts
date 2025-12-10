import { Request, Response, NextFunction } from 'express';
import * as admin from 'firebase-admin';

export interface UserProfile {
    uid: string;
    email: string;
    displayName: string;
    role: "citizen" | "official" | "superadmin" | "city_admin" | "dept_admin" | "ward_admin";
    trustScore: number;
    department?: string | null;
    adminArea?: { state?: string; district?: string; city?: string; wardCode?: string } | null;
}

export interface AuthRequest extends Request {
    user?: admin.auth.DecodedIdToken;
    userProfile?: UserProfile;
}

export const verifyToken = async (req: AuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }

    const token = authHeader.split(' ')[1];
    try {
        const decodedToken = await admin.auth().verifyIdToken(token);
        req.user = decodedToken;

        // Fetch User Profile from Firestore
        const db = admin.firestore();
        const userDoc = await db.collection('users').doc(decodedToken.uid).get();

        if (!userDoc.exists) {
            // Special case: Allow if it's a new user creation flow (handled by client logic usually, but here we might block)
            // Ideally, we block. But for "first login" where we create the doc, we might need to be lenient OR ensure doc is created via trigger/client first.
            // The requirement says: "After first successful login: Create Firestore users/{uid} if it does not exist."
            // This logic usually happens on the client or a separate onboarding endpoint.
            // For SECURE routes, we MUST have a profile.
            return res.status(403).json({ error: 'Forbidden: User profile not found. Please complete onboarding.' });
        }

        req.userProfile = userDoc.data() as UserProfile;
        next();
    } catch (error) {
        console.error("Error verifying token:", error);
        return res.status(403).json({ error: 'Forbidden: Invalid token' });
    }
};

export const authorize = (allowedRoles: string[]) => {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
        if (!req.userProfile) {
            return res.status(403).json({ error: 'Forbidden: No user profile' });
        }

        if (!allowedRoles.includes(req.userProfile.role)) {
            return res.status(403).json({ error: `Forbidden: Requires one of [${allowedRoles.join(', ')}]` });
        }

        next();
    };
};
