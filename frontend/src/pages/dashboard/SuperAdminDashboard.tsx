import React from 'react';
import { Link } from 'react-router-dom';
import { Server, Globe, Users, Shield } from 'lucide-react';

export const SuperAdminDashboard: React.FC = () => {
    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <h1 className="text-2xl font-bold text-white mb-8 drop-shadow-md">Super Admin Console</h1>

            {/* Platform Overview */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-4 mb-8">
                <div className="bg-white/10 backdrop-blur-md overflow-hidden shadow-lg rounded-lg p-5 border border-white/20">
                    <dt className="text-sm font-medium text-primary-200 truncate">Total Cities</dt>
                    <dd className="mt-1 text-3xl font-semibold text-white">1</dd>
                </div>
                <div className="bg-white/10 backdrop-blur-md overflow-hidden shadow-lg rounded-lg p-5 border border-white/20">
                    <dt className="text-sm font-medium text-primary-200 truncate">Total Users</dt>
                    <dd className="mt-1 text-3xl font-semibold text-blue-300">1,240</dd>
                </div>
                <div className="bg-white/10 backdrop-blur-md overflow-hidden shadow-lg rounded-lg p-5 border border-white/20">
                    <dt className="text-sm font-medium text-primary-200 truncate">System Health</dt>
                    <dd className="mt-1 text-3xl font-semibold text-green-300">99.9%</dd>
                </div>
                <div className="bg-white/10 backdrop-blur-md overflow-hidden shadow-lg rounded-lg p-5 border border-white/20">
                    <dt className="text-sm font-medium text-primary-200 truncate">AI Processed</dt>
                    <dd className="mt-1 text-3xl font-semibold text-purple-300">850</dd>
                </div>
            </div>

            {/* Management Sections */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-white/10 backdrop-blur-md shadow-lg rounded-lg p-6 border border-white/20">
                    <h3 className="text-lg font-medium text-white mb-4 flex items-center">
                        <Globe className="h-5 w-5 mr-2" /> City Management
                    </h3>
                    <p className="text-primary-200 mb-4 text-sm">Manage onboarded cities, configure boundaries, and assign city admins.</p>
                    <button className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700">Manage Cities</button>
                </div>

                <div className="bg-white/10 backdrop-blur-md shadow-lg rounded-lg p-6 border border-white/20">
                    <h3 className="text-lg font-medium text-white mb-4 flex items-center">
                        <Users className="h-5 w-5 mr-2" /> Admin User Management
                    </h3>
                    <p className="text-primary-200 mb-4 text-sm">Create and manage City Admins and other high-level officials.</p>
                    <Link to="/admin/officials" className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 inline-block">Manage Admins</Link>
                </div>

                <div className="bg-white/10 backdrop-blur-md shadow-lg rounded-lg p-6 border border-white/20">
                    <h3 className="text-lg font-medium text-white mb-4 flex items-center">
                        <Server className="h-5 w-5 mr-2" /> System Configuration
                    </h3>
                    <p className="text-primary-200 mb-4 text-sm">Configure AI providers (Gemini/Groq), API keys, and storage settings.</p>
                    <button className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700">System Settings</button>
                </div>

                <div className="bg-white/10 backdrop-blur-md shadow-lg rounded-lg p-6 border border-white/20">
                    <h3 className="text-lg font-medium text-white mb-4 flex items-center">
                        <Shield className="h-5 w-5 mr-2" /> Security Audit
                    </h3>
                    <p className="text-primary-200 mb-4 text-sm">View security logs, login attempts, and role changes.</p>
                    <button className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700">View Logs</button>
                </div>
            </div>
        </div>
    );
};
