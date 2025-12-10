import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export const DashboardRedirect: React.FC = () => {
    const { userProfile, loading } = useAuth();

    if (loading) {
        return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
    }

    if (!userProfile) {
        return <Navigate to="/login" replace />;
    }

    switch (userProfile.role) {
        case 'superadmin':
            return <Navigate to="/super/dashboard" replace />;
        case 'city_admin':
            return <Navigate to="/city/dashboard" replace />;
        case 'dept_admin':
            return <Navigate to="/dept/dashboard" replace />;
        case 'ward_admin':
            return <Navigate to="/ward/dashboard" replace />;
        case 'citizen':
            return <Navigate to="/citizen/dashboard" replace />;
        default:
            return <Navigate to="/login" replace />;
    }
};
