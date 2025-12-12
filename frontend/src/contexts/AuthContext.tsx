import React, { createContext, useContext, useEffect, useState } from "react";
import { type User, onAuthStateChanged, signOut as firebaseSignOut } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "../lib/firebase";

export type UserRole = "citizen" | "admin";

export interface UserProfile {
    uid: string;
    email: string | null;
    displayName: string | null;
    role: UserRole;
    adminLevel?: 'ward' | 'city';
    assignedWard?: string;
    city?: string;
    area?: string;
    preferredLanguage?: string;
    trustScore?: number;
}

interface AuthContextType {
    currentUser: User | null;
    userProfile: UserProfile | null;
    loading: boolean;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let profileUnsubscribe: (() => void) | null = null;

        const authUnsubscribe = onAuthStateChanged(auth, (user) => {
            setCurrentUser(user);

            // Clean up previous profile listener
            if (profileUnsubscribe) {
                profileUnsubscribe();
                profileUnsubscribe = null;
            }

            if (user) {
                // Subscribe to user profile changes
                profileUnsubscribe = onSnapshot(doc(db, "users", user.uid), (docSnap) => {
                    if (docSnap.exists()) {
                        const data = docSnap.data();
                        let role = data.role || "citizen";

                        // Normalize admin roles
                        if (["ward_admin", "dept_admin", "city_admin", "superadmin", "official"].includes(role)) {
                            role = "admin";
                        }

                        setUserProfile({
                            ...data,
                            role: role as UserRole,
                            adminLevel: data.adminLevel,
                            assignedWard: data.assignedWard
                        } as UserProfile);
                    } else {
                        // Fallback if user doc doesn't exist yet (e.g. during signup before firestore write)
                        setUserProfile({
                            uid: user.uid,
                            email: user.email,
                            displayName: user.displayName,
                            role: "citizen"
                        });
                    }
                    setLoading(false);
                }, (error: any) => {
                    console.error("Error fetching user profile:", error);
                    setLoading(false);
                });
            } else {
                setUserProfile(null);
                setLoading(false);
            }
        });

        return () => {
            authUnsubscribe();
            if (profileUnsubscribe) profileUnsubscribe();
        };
    }, []);

    const logout = async () => {
        await firebaseSignOut(auth);
    };

    return (
        <AuthContext.Provider value={{ currentUser, userProfile, loading, logout }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
