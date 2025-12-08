import React, { useEffect, useState } from 'react';
import { getAllComplaints, getPublicStats, type Complaint } from '../../services/complaintService';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { PublicComplaintStats } from '../../components/public/PublicComplaintStats';
import { PublicComplaintList } from '../../components/public/PublicComplaintList';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export const PublicDashboard: React.FC = () => {
    const [complaints, setComplaints] = useState<Complaint[]>([]);
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [complaintsData, statsData] = await Promise.all([
                getAllComplaints(),
                getPublicStats()
            ]);
            setComplaints(complaintsData);
            setStats(statsData);
        } catch (error) {
            console.error("Failed to load public data", error);
        } finally {
            setLoading(false);
        }
    };

    // Analytics Data Preparation
    const categoryData = complaints.reduce((acc: any, curr) => {
        acc[curr.category] = (acc[curr.category] || 0) + 1;
        return acc;
    }, {});

    const chartData = Object.keys(categoryData).map(key => ({
        name: key,
        count: categoryData[key]
    }));

    const getMarkerColor = (category: string) => {
        switch (category) {
            case 'Roads': return 'red';
            case 'Water': return 'blue';
            case 'Electricity': return 'yellow';
            case 'Sanitation': return 'green';
            case 'Public Safety': return 'purple';
            default: return 'gray';
        }
    };

    if (loading) return <div className="h-screen flex items-center justify-center">Loading Dashboard...</div>;

    return (
        <div className="h-screen flex flex-col md:flex-row overflow-hidden bg-gray-50">
            {/* Sidebar (Stats & List) */}
            <div className="w-full md:w-96 bg-white shadow-xl z-20 flex flex-col h-full overflow-hidden">
                <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-white">
                    <h1 className="text-xl font-bold text-gray-900">Civic Pulse</h1>
                    <Link to="/" className="text-sm text-primary-600 hover:text-primary-700 flex items-center">
                        <ArrowLeft className="h-4 w-4 mr-1" /> Home
                    </Link>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                    <PublicComplaintStats stats={stats} categoryData={chartData} />
                    <PublicComplaintList complaints={complaints.slice(0, 10)} />
                </div>

                <div className="p-4 border-t border-gray-200 bg-gray-50 text-center text-xs text-gray-500">
                    Data updated in real-time.
                </div>
            </div>

            {/* Main Map Area */}
            <div className="flex-1 relative h-full">
                <MapContainer center={[20.5937, 78.9629]} zoom={5} style={{ height: '100%', width: '100%' }}>
                    <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    />
                    {complaints.map(c => (
                        c.location && (
                            <CircleMarker
                                key={c.id}
                                center={[c.location.lat, c.location.lng]}
                                pathOptions={{ color: getMarkerColor(c.category), fillColor: getMarkerColor(c.category) }}
                                radius={6}
                                fillOpacity={0.6}
                            >
                                <Popup>
                                    <div className="text-sm">
                                        <strong className="block text-gray-900">{c.category}</strong>
                                        <span className="text-gray-500 capitalize">{c.status.replace('_', ' ')}</span>
                                        <p className="text-xs text-gray-400 mt-1">{c.location.address}</p>
                                    </div>
                                </Popup>
                            </CircleMarker>
                        )
                    ))}
                </MapContainer>

                {/* Floating Legend or Filters could go here */}
                <div className="absolute top-4 right-4 bg-white p-2 rounded shadow-md z-[1000] text-xs">
                    <div className="font-semibold mb-1">Legend</div>
                    <div className="space-y-1">
                        <div className="flex items-center"><span className="w-3 h-3 rounded-full bg-red-500 mr-2"></span> Roads</div>
                        <div className="flex items-center"><span className="w-3 h-3 rounded-full bg-blue-500 mr-2"></span> Water</div>
                        <div className="flex items-center"><span className="w-3 h-3 rounded-full bg-yellow-500 mr-2"></span> Electricity</div>
                        <div className="flex items-center"><span className="w-3 h-3 rounded-full bg-green-500 mr-2"></span> Sanitation</div>
                    </div>
                </div>
            </div>
        </div>
    );
};
