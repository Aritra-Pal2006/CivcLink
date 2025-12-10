import React, { useEffect, useState } from 'react';
import { getAdminComplaints, type Complaint } from '../../services/complaintService';
import { Link } from 'react-router-dom';
import { Users, Activity, Map } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

export const CityAdminDashboard: React.FC = () => {
    const { userProfile, currentUser } = useAuth();
    const [complaints, setComplaints] = useState<Complaint[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        total: 0,
        open: 0,
        closed: 0,
        overdue: 0,
        fraudFlagged: 0,
        today: 0
    });

    useEffect(() => {
        loadDashboardData();
    }, [currentUser]);

    const loadDashboardData = async () => {
        if (!currentUser) return;
        try {
            setLoading(true);
            const token = await currentUser.getIdToken();

            // Fetch all complaints for this city (limit 500 for analytics)
            // In a real app, we'd use a dedicated stats endpoint.
            const data = await getAdminComplaints({ limit: 500 }, token);
            const allComplaints = data.complaints;
            setComplaints(allComplaints);

            // Calculate Stats
            const now = new Date();
            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);

            const newStats = {
                total: allComplaints.length,
                open: allComplaints.filter((c: Complaint) => ['submitted', 'in_progress', 'pending_verification'].includes(c.status)).length,
                closed: allComplaints.filter((c: Complaint) => c.status === 'resolved').length,
                overdue: allComplaints.filter((c: Complaint) => {
                    // Mock SLA: 3 days for medium priority
                    if (c.status === 'resolved') return false;
                    const created = new Date((c.createdAt as any)._seconds * 1000);
                    const diffTime = Math.abs(now.getTime() - created.getTime());
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    return diffDays > 3;
                }).length,
                fraudFlagged: allComplaints.filter((c: Complaint) => c.status === 'flagged' || (c.status as string) === 'flagged_duplicate' || (c as any).isEscalated).length,
                today: allComplaints.filter((c: Complaint) => {
                    const created = new Date((c.createdAt as any)._seconds * 1000);
                    return created >= todayStart;
                }).length
            };
            setStats(newStats);

        } catch (error) {
            console.error("Failed to load dashboard data", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {loading && <div className="text-white text-center mb-4">Loading dashboard data...</div>}
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-white drop-shadow-md">City Command Center: {userProfile?.adminArea?.city || 'Unassigned'}</h1>
                    <p className="text-primary-100">Real-time city-wide monitoring</p>
                </div>
                <div className="flex space-x-3">
                    <Link to="/city/escalations" className="bg-red-600 text-white px-4 py-2 rounded-lg font-medium shadow hover:bg-red-700 transition-colors flex items-center">
                        <Activity className="h-5 w-5 mr-2" />
                        Escalations ({stats.fraudFlagged})
                    </Link>
                    <Link to="/city/officials" className="bg-white text-indigo-600 px-4 py-2 rounded-lg font-medium shadow hover:bg-indigo-50 transition-colors flex items-center">
                        <Users className="h-5 w-5 mr-2" />
                        Manage Officials
                    </Link>
                </div>
            </div>

            {/* City KPIs */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
                <div className="bg-white/10 backdrop-blur-md overflow-hidden shadow-lg rounded-lg p-5 border border-white/20">
                    <dt className="text-sm font-medium text-primary-200 truncate">Total Complaints</dt>
                    <dd className="mt-1 text-3xl font-semibold text-white">{stats.total}</dd>
                    <div className="mt-2 text-xs text-primary-300">
                        <span className="text-green-300">+{stats.today}</span> today
                    </div>
                </div>
                <div className="bg-white/10 backdrop-blur-md overflow-hidden shadow-lg rounded-lg p-5 border border-white/20">
                    <dt className="text-sm font-medium text-primary-200 truncate">Open Cases</dt>
                    <dd className="mt-1 text-3xl font-semibold text-white">{stats.open}</dd>
                    <div className="mt-2 text-xs text-primary-300">
                        {Math.round((stats.open / (stats.total || 1)) * 100)}% of total
                    </div>
                </div>
                <div className="bg-white/10 backdrop-blur-md overflow-hidden shadow-lg rounded-lg p-5 border border-white/20">
                    <dt className="text-sm font-medium text-primary-200 truncate">Overdue (SLA Breach)</dt>
                    <dd className="mt-1 text-3xl font-semibold text-red-300">{stats.overdue}</dd>
                    <div className="mt-2 text-xs text-primary-300">
                        Requires immediate attention
                    </div>
                </div>
                <div className="bg-white/10 backdrop-blur-md overflow-hidden shadow-lg rounded-lg p-5 border border-white/20">
                    <dt className="text-sm font-medium text-primary-200 truncate">Resolution Rate</dt>
                    <dd className="mt-1 text-3xl font-semibold text-green-300">
                        {stats.total > 0 ? Math.round((stats.closed / stats.total) * 100) : 0}%
                    </dd>
                    <div className="mt-2 text-xs text-primary-300">
                        Target: 85%
                    </div>
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Left Column: Map & Ward Performance */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Real Heatmap */}
                    <div className="bg-white/10 backdrop-blur-md shadow-lg rounded-lg p-6 border border-white/20 min-h-[400px] flex flex-col">
                        <h3 className="text-lg font-medium text-white mb-4 flex items-center">
                            <Map className="h-5 w-5 mr-2" /> City Heatmap
                        </h3>
                        <div className="flex-1 bg-gray-900/50 rounded-lg overflow-hidden border border-white/10 relative z-0">
                            <MapContainer center={[12.9716, 77.5946]} zoom={12} style={{ height: '100%', width: '100%' }} className="z-0">
                                <TileLayer
                                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                />
                                {complaints.filter(c => c.location && c.location.lat && c.location.lng).map(c => (
                                    <CircleMarker
                                        key={c.id}
                                        center={[c.location.lat, c.location.lng]}
                                        radius={10}
                                        pathOptions={{
                                            color: c.status === 'resolved' ? 'green' : c.status === 'flagged' ? 'red' : 'orange',
                                            fillColor: c.status === 'resolved' ? '#4ade80' : c.status === 'flagged' ? '#ef4444' : '#f59e0b',
                                            fillOpacity: 0.6,
                                            stroke: false
                                        }}
                                    >
                                        <Popup>
                                            <div className="text-gray-900">
                                                <strong>{c.title}</strong><br />
                                                Status: {c.status}<br />
                                                Ward: {(c.location as any)?.wardCode}
                                            </div>
                                        </Popup>
                                    </CircleMarker>
                                ))}
                            </MapContainer>
                        </div>
                    </div>

                    {/* Recent Activity List */}
                    <div className="bg-white/10 backdrop-blur-md shadow-lg rounded-lg p-6 border border-white/20">
                        <h3 className="text-lg font-medium text-white mb-4 flex items-center">
                            <Activity className="h-5 w-5 mr-2" /> Recent Activity
                        </h3>
                        <ul className="space-y-3">
                            {complaints.slice(0, 5).map(c => (
                                <li key={c.id} className="text-sm text-primary-100 border-b border-white/10 pb-2 flex justify-between items-center">
                                    <div>
                                        <span className="font-medium text-white">{c.title}</span>
                                        <span className="block text-xs text-primary-300">{(c.location as any)?.wardCode || 'Unknown Ward'} • {c.status}</span>
                                    </div>
                                    <Link to={`/complaints/${c.id}`} className="text-xs bg-white/10 hover:bg-white/20 px-2 py-1 rounded text-white transition-colors">View</Link>
                                </li>
                            ))}
                        </ul>
                        <div className="mt-4">
                            <Link to="/city/complaints" className="text-primary-300 hover:text-white text-sm font-medium">View All Complaints &rarr;</Link>
                        </div>
                    </div>
                </div>

                {/* Right Column: Quick Actions & Ward Stats */}
                <div className="space-y-8">
                    {/* Quick Actions */}
                    <div className="bg-white/10 backdrop-blur-md shadow-lg rounded-lg p-6 border border-white/20">
                        <h3 className="text-lg font-medium text-white mb-4">Quick Actions</h3>
                        <div className="space-y-3">
                            <Link to="/city/complaints?status=submitted" className="block w-full text-left px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white transition-colors">
                                Review New Complaints
                            </Link>
                            <Link to="/city/complaints?priority=high" className="block w-full text-left px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white transition-colors">
                                High Priority Cases
                            </Link>
                            <Link to="/city/officials" className="block w-full text-left px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white transition-colors">
                                Add New Ward Admin
                            </Link>
                            <Link to="/city/analytics" className="block w-full text-left px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white transition-colors">
                                Download Reports
                            </Link>
                        </div>
                    </div>

                    {/* Ward Performance (Mock for now, but dynamic based on loaded data) */}
                    <div className="bg-white/10 backdrop-blur-md shadow-lg rounded-lg p-6 border border-white/20">
                        <h3 className="text-lg font-medium text-white mb-4">Ward Performance</h3>
                        <div className="space-y-4">
                            {['W01', 'W02', 'W03'].map(ward => {
                                const wardCount = complaints.filter((c: Complaint) => (c.location as any)?.wardCode === ward).length;
                                const total = complaints.length || 1;
                                const pct = Math.min(100, Math.round((wardCount / total) * 100) + 10); // Mock scale
                                return (
                                    <div key={ward} className="flex justify-between items-center">
                                        <span className="text-primary-100">Ward {ward}</span>
                                        <div className="w-32 bg-white/20 rounded-full h-2">
                                            <div className={`h-2 rounded-full ${pct > 50 ? 'bg-red-400' : 'bg-green-400'}`} style={{ width: `${pct}%` }}></div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
