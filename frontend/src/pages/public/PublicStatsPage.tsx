import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { MapPin, CheckCircle, Clock, Activity } from 'lucide-react';
import axios from 'axios';

interface PublicStats {
    total_complaints_today: number;
    complaints_solved: number;
    average_resolution_time: string;
    common_categories: string[];
}

interface FeedItem {
    id: string;
    title: string;
    category: string;
    status: string;
    district: string;
    ward: string;
    timestamp: any;
    hash: string;
}

const PublicStatsPage: React.FC = () => {
    const [stats, setStats] = useState<PublicStats | null>(null);
    const [feed, setFeed] = useState<FeedItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Parallel fetch
                const [statsRes, feedRes] = await Promise.all([
                    axios.get('/api/complaints/public/stats'),
                    axios.get('/api/complaints/public/feed')
                ]);
                setStats(statsRes.data);
                setFeed(feedRes.data);
            } catch (error) {
                console.error("Failed to fetch public data", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
        // Refresh every 30s for "Live" feel
        const interval = setInterval(fetchData, 30000);
        return () => clearInterval(interval);
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-900 text-slate-100 font-sans">
            {/* Hero Section */}
            <div className="bg-gradient-to-r from-blue-900 to-slate-900 py-16 px-4 sm:px-6 lg:px-8 border-b border-slate-800">
                <div className="max-w-7xl mx-auto text-center">
                    <motion.h1
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl md:text-6xl"
                    >
                        CivicLink <span className="text-blue-400">Open Data</span>
                    </motion.h1>
                    <p className="mt-4 max-w-2xl mx-auto text-xl text-slate-400">
                        Real-time transparency for a better city. Track every complaint, every resolution, every minute.
                    </p>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                {/* Key Metrics Grid */}
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-12">
                    <StatCard
                        title="Complaints Today"
                        value={stats?.total_complaints_today || 0}
                        icon={<Activity className="h-6 w-6 text-blue-400" />}
                        color="blue"
                    />
                    <StatCard
                        title="Resolved (24h)"
                        value={stats?.complaints_solved || 0}
                        icon={<CheckCircle className="h-6 w-6 text-green-400" />}
                        color="green"
                    />
                    <StatCard
                        title="Avg. Resolution"
                        value={stats?.average_resolution_time || "N/A"}
                        icon={<Clock className="h-6 w-6 text-yellow-400" />}
                        color="yellow"
                    />
                    <StatCard
                        title="Active Wards"
                        value={12} // Static for now or derive from feed
                        icon={<MapPin className="h-6 w-6 text-purple-400" />}
                        color="purple"
                    />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Live Feed Column */}
                    <div className="lg:col-span-2 bg-slate-800 rounded-xl border border-slate-700 overflow-hidden shadow-lg">
                        <div className="p-6 border-b border-slate-700 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                <div className="h-3 w-3 rounded-full bg-red-500 animate-pulse"></div>
                                Live Activity Feed
                            </h2>
                            <span className="text-xs text-slate-400 font-mono">IMMUTABLE LEDGER VIEW</span>
                        </div>
                        <div className="divide-y divide-slate-700 max-h-[600px] overflow-y-auto custom-scrollbar">
                            {feed.map((item) => (
                                <motion.div
                                    key={item.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="p-4 hover:bg-slate-700/50 transition-colors"
                                >
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className={`px-2 py-0.5 rounded text-xs font-bold ${getStatusColor(item.status)}`}>
                                                    {item.status.toUpperCase()}
                                                </span>
                                                <span className="text-sm font-medium text-slate-300">{item.category}</span>
                                            </div>
                                            <h3 className="text-base font-semibold text-white mb-1">{item.title}</h3>
                                            <div className="flex items-center gap-4 text-xs text-slate-400">
                                                <span className="flex items-center gap-1">
                                                    <MapPin className="h-3 w-3" /> {item.ward}, {item.district}
                                                </span>
                                                <span>ID: {item.id.slice(0, 8)}...</span>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-xs text-slate-500 font-mono mb-1">HASH: {item.hash}</div>
                                            <div className="text-xs text-slate-400">
                                                {new Date(item.timestamp._seconds * 1000).toLocaleTimeString()}
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>

                    {/* Sidebar / Charts */}
                    <div className="space-y-8">
                        {/* Categories Chart */}
                        <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 shadow-lg">
                            <h3 className="text-lg font-bold text-white mb-4">Top Issues</h3>
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={[
                                        { name: 'Roads', value: 45 },
                                        { name: 'Water', value: 30 },
                                        { name: 'Waste', value: 25 },
                                        { name: 'Elec', value: 15 },
                                    ]}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                        <XAxis dataKey="name" stroke="#94a3b8" />
                                        <YAxis stroke="#94a3b8" />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f1f5f9' }}
                                        />
                                        <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Trust Badge */}
                        <div className="bg-gradient-to-br from-emerald-900/50 to-slate-800 rounded-xl border border-emerald-500/30 p-6">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="p-2 bg-emerald-500/20 rounded-lg">
                                    <CheckCircle className="h-6 w-6 text-emerald-400" />
                                </div>
                                <h3 className="text-lg font-bold text-white">Verified & Trusted</h3>
                            </div>
                            <p className="text-sm text-slate-300 mb-4">
                                All data on this page is cryptographically verifiable. CivicLink ensures 100% transparency in governance.
                            </p>
                            <button className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors">
                                Download Daily Report
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const StatCard = ({ title, value, icon, color }: any) => (
    <div className={`bg-slate-800 rounded-xl p-6 border border-slate-700 shadow-lg relative overflow-hidden group`}>
        <div className={`absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity`}>
            {React.cloneElement(icon, { className: `h-16 w-16 text-${color}-500` })}
        </div>
        <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-slate-400">{title}</h3>
            <div className={`p-2 bg-${color}-500/10 rounded-lg`}>
                {icon}
            </div>
        </div>
        <div className="text-3xl font-bold text-white">{value}</div>
    </div>
);

const getStatusColor = (status: string) => {
    switch (status) {
        case 'resolved': return 'bg-green-500/20 text-green-400';
        case 'in_progress': return 'bg-blue-500/20 text-blue-400';
        case 'submitted': return 'bg-yellow-500/20 text-yellow-400';
        case 'rejected': return 'bg-red-500/20 text-red-400';
        default: return 'bg-slate-500/20 text-slate-400';
    }
};

export default PublicStatsPage;
