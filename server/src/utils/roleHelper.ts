import * as admin from 'firebase-admin';

const db = admin.firestore();

export interface UserRoleInfo {
    uid: string;
    role: 'citizen' | 'admin';
    adminLevel?: 'ward' | 'city';
    assignedWard?: string;
    assignedCity?: string;
}

export const getCurrentUserRole = async (uid: string): Promise<UserRoleInfo> => {
    if (!uid) {
        throw new Error("User ID is required");
    }

    const userDoc = await db.collection('users').doc(uid).get();

    if (!userDoc.exists) {
        // Default to citizen if user doc doesn't exist (e.g. fresh auth user)
        return { uid, role: 'citizen' };
    }

    const data = userDoc.data();
    let role = data?.role || 'citizen';

    // Normalize admin roles
    if (['ward_admin', 'dept_admin', 'city_admin', 'superadmin', 'official'].includes(role)) {
        role = 'admin';
    }

    return {
        uid,
        role: role as 'citizen' | 'admin',
        adminLevel: data?.adminLevel,
        assignedWard: data?.assignedWard,
        assignedCity: data?.assignedCity
    };
};
