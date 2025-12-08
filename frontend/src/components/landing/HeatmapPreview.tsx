import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import { Link } from 'react-router-dom';
import { getAllComplaints, type Complaint } from '../../services/complaintService';

export const HeatmapPreview: React.FC = () => {
    const [complaints, setComplaints] = useState<Complaint[]>([]);

    useEffect(() => {
        const fetchComplaints = async () => {
            try {
                // In a real app, we might want a lighter query here (e.g., limit 50)
                const data = await getAllComplaints();
                setComplaints(data.slice(0, 50)); // Limit for preview
            } catch (error) {
                console.error("Failed to load map preview", error);
            }
        };
        fetchComplaints();
    }, []);

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

    return (
        <div className="py-12 bg-transparent">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="lg:text-center mb-8">
                    <h2 className="text-base text-primary-300 font-semibold tracking-wide uppercase">Live Data</h2>
                    <p className="mt-2 text-3xl leading-8 font-extrabold tracking-tight text-white sm:text-4xl drop-shadow-md">
                        See What's Happening
                    </p>
                    <p className="mt-4 max-w-2xl text-xl text-primary-100 lg:mx-auto">
                        Explore real-time civic issues reported by your neighbors.
                    </p>
                </div>

                <div className="relative h-96 w-full rounded-xl overflow-hidden shadow-2xl border border-white/20">
                    <MapContainer center={[20.5937, 78.9629]} zoom={5} style={{ height: '100%', width: '100%' }} scrollWheelZoom={false}>
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
                                    radius={5}
                                >
                                    <Popup>
                                        <strong>{c.category}</strong><br />
                                        {c.status}
                                    </Popup>
                                </CircleMarker>
                            )
                        ))}
                    </MapContainer>

                    {/* Overlay Button */}
                    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-[1000]">
                        <Link
                            to="/public-dashboard"
                            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-full shadow-lg text-primary-900 bg-white hover:bg-primary-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                        >
                            View Full Public Dashboard
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};
