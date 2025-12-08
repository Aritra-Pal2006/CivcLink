import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { CitizenDashboard } from './CitizenDashboard';
import { AdminDashboard } from './AdminDashboard';

export const DashboardPage: React.FC = () => {
    const { userProfile } = useAuth();

    if (!userProfile) return <div>Loading...</div>;

    if (userProfile.role === 'official' || userProfile.role === 'superadmin') {
        return <AdminDashboard />;
    }

    return <CitizenDashboard />;
};
