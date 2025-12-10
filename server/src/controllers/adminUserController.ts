import { Request, Response } from 'express';
import * as admin from 'firebase-admin';
import { AuthRequest } from '../middleware/auth';

const db = admin.firestore();

// GET /api/admin/users
export const getUsers = async (req: AuthRequest, res: Response) => {
    try {
        const { role, city, department } = req.query;
        const currentUserRole = req.userProfile!.role;
        const currentUserArea = req.userProfile!.adminArea;

        let query: admin.firestore.Query = db.collection('users');

        // Filter by role if provided
        if (role) {
            query = query.where('role', '==', role);
        }

        const snapshot = await query.limit(100).get();
        let users = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as any));

        // --- STRICT SCOPING ENFORCEMENT ---
        if (currentUserRole === 'city_admin') {
            const myCity = currentUserArea?.city;
            if (!myCity) {
                return res.status(403).json({ error: "City Admin has no assigned city." });
            }

            // Filter in-memory: Only show users in my city OR users with NO city (e.g. unassigned) but NOT superadmins
            users = users.filter(u => {
                // 1. Hide Super Admins
                if (u.role === 'superadmin') return false;

                // 2. Hide other City Admins (optional, but good for isolation)
                if (u.role === 'city_admin' && u.uid !== req.user!.uid) return false;

                // 3. Show if in my city
                if (u.adminArea?.city === myCity) return true;

                // 4. Show if unassigned (so we can claim them)? Or maybe only show explicitly assigned ones?
                // Let's show unassigned so they can be managed/assigned.
                if (!u.adminArea?.city) return true;

                return false;
            });
        }

        res.json(users);
    } catch (error) {
        console.error("Error fetching users:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

// PUT /api/admin/users/:uid/role
export const assignRole = async (req: AuthRequest, res: Response) => {
    try {
        const { uid } = req.params;
        const { role, department, adminArea } = req.body;
        const currentUserRole = req.userProfile!.role;

        // Validation
        const validRoles = ['citizen', 'official', 'ward_admin', 'dept_admin', 'city_admin', 'superadmin'];
        if (!validRoles.includes(role)) {
            return res.status(400).json({ error: "Invalid role" });
        }

        // Permission Checks
        if (currentUserRole === 'city_admin') {
            if (['superadmin', 'city_admin'].includes(role)) {
                return res.status(403).json({ error: "City Admin cannot assign Superadmin or City Admin roles." });
            }
            // Can assign dept_admin, ward_admin
        } else if (currentUserRole !== 'superadmin') {
            return res.status(403).json({ error: "Unauthorized to assign roles." });
        }

        await db.collection('users').doc(uid).update({
            role,
            department: department || null,
            adminArea: adminArea || null,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        res.json({ message: `User ${uid} role updated to ${role}` });
    } catch (error) {
        console.error("Error assigning role:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

// POST /api/admin/users/invite
export const inviteUser = async (req: AuthRequest, res: Response) => {
    try {
        const { email, password, displayName, role, department, adminArea } = req.body;
        const currentUserRole = req.userProfile!.role;

        // Permission Checks
        if (currentUserRole === 'city_admin') {
            if (['superadmin', 'city_admin'].includes(role)) {
                return res.status(403).json({ error: "City Admin cannot create Superadmin or City Admin." });
            }
        } else if (currentUserRole !== 'superadmin') {
            return res.status(403).json({ error: "Unauthorized to invite users." });
        }

        // 1. Create in Firebase Auth
        const userRecord = await admin.auth().createUser({
            email,
            password,
            displayName
        });

        // 2. Create in Firestore
        await db.collection('users').doc(userRecord.uid).set({
            uid: userRecord.uid,
            email,
            displayName,
            role,
            department: department || null,
            adminArea: adminArea || null,
            trustScore: 100,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        res.status(201).json({
            message: "User created successfully",
            uid: userRecord.uid
        });

    } catch (error: any) {
        console.error("Error inviting user:", error);
        res.status(500).json({ error: error.message || "Internal Server Error" });
    }
};
