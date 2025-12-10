import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth, type UserRole } from '../contexts/AuthContext';

interface ProtectedRouteProps {
    children: React.ReactNode;
    allowedRoles?: UserRole[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
    const { currentUser, userProfile, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
    }

    if (!currentUser) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (allowedRoles && userProfile) {
        if (!allowedRoles.includes(userProfile.role)) {
            return <Navigate to="/unauthorized" replace />;
        }
    }

    return <>{children}</>;
};
