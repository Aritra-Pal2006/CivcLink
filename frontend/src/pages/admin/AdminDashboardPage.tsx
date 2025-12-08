import React, { useEffect, useState } from 'react';
import { collection, query, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import type { Complaint } from '../../services/complaintService';
import { useAuth } from '../../contexts/AuthContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import { ShieldCheck, AlertTriangle } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

// Simple Heatmap simulation using CircleMarkers with opacity
const HeatmapLayer = ({ complaints }: { complaints: Complaint[] }) => {
    return (
        <>
            {complaints.map(c => (
                <CircleMarker
                    key={c.id}
                    center={[c.location.lat, c.location.lng]}
                    radius={20}
                    pathOptions={{
                        color: 'red',
                        fillColor: '#f03',
                        fillOpacity: 0.1,
                        stroke: false
                    }}
                >
                    <Popup>{c.title}</Popup>
                </CircleMarker>
            ))}
        </>
    );
};

export const AdminDashboardPage: React.FC = () => {
    const { userProfile } = useAuth();
    const [complaints, setComplaints] = useState<Complaint[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchComplaints = async () => {
            try {
                const q = query(collection(db, 'complaints'), orderBy('createdAt', 'desc'), limit(100));
                const snapshot = await getDocs(q);
                setComplaints(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Complaint)));
            } catch (error) {
                console.error("Error fetching admin stats:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchComplaints();
    }, []);

    const categoryData = Object.entries(complaints.reduce((acc, curr) => {
        acc[curr.category] = (acc[curr.category] || 0) + 1;
        return acc;
    }, {} as Record<string, number>)).map(([name, value]) => ({ name, value }));

    const statusData = Object.entries(complaints.reduce((acc, curr) => {
        acc[curr.status] = (acc[curr.status] || 0) + 1;
        return acc;
    }, {} as Record<string, number>)).map(([name, value]) => ({ name, value }));

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

    if (loading) return <div>Loading analytics...</div>;

    return (
        <div className="space-y-8">
            <h1 className="text-2xl font-bold text-gray-900">City Analytics & Insights</h1>

            {/* Trust Score Card */}
            {userProfile?.role === 'official' && (
                <div className={`p-6 rounded-lg shadow border ${(userProfile.trustScore || 100) >= 80 ? 'bg-green-50 border-green-200' :
                    (userProfile.trustScore || 100) >= 50 ? 'bg-yellow-50 border-yellow-200' :
                        'bg-red-50 border-red-200'
                    }`}>
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-medium text-gray-900 flex items-center">
                                <ShieldCheck className="h-5 w-5 mr-2" />
                                Your Trust Score
                            </h2>
                            <p className="text-sm text-gray-600 mt-1">
                                Based on community verification of your resolutions.
                            </p>
                        </div>
                        <div className="text-4xl font-bold text-gray-900">
                            {userProfile.trustScore ?? 100}
                        </div>
                    </div>
                    {(userProfile.trustScore || 100) < 50 && (
                        <div className="mt-4 flex items-center text-sm text-red-700 bg-red-100 p-2 rounded">
                            <AlertTriangle className="h-4 w-4 mr-2" />
                            Warning: Your trust score is low. Your resolutions now require community verification.
                        </div>
                    )}
                </div>
            )}

            {/* Heatmap Section */}
            <div className="bg-white p-6 rounded-lg shadow">
                <h2 className="text-lg font-medium mb-4">Complaint Heatmap</h2>
                <div className="h-96 w-full rounded-lg overflow-hidden">
                    <MapContainer center={[28.6139, 77.2090]} zoom={11} style={{ height: '100%', width: '100%' }}>
                        <TileLayer
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        />
                        <HeatmapLayer complaints={complaints} />
                    </MapContainer>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white p-6 rounded-lg shadow">
                    <h2 className="text-lg font-medium mb-4">Complaints by Category</h2>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={categoryData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="value" fill="#8884d8" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow">
                    <h2 className="text-lg font-medium mb-4">Status Distribution</h2>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={statusData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ name, percent }: { name?: string | number; percent?: number }) => `${name ?? ''} ${((percent || 0) * 100).toFixed(0)}%`}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    dataKey="value"
                                >
                                    {statusData.map((_, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
};
