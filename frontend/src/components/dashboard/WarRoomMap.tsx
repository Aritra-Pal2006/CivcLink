import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.heat';
import type { Complaint } from '../../services/complaintService';
import markerIconPng from "leaflet/dist/images/marker-icon.png";
import markerShadowPng from "leaflet/dist/images/marker-shadow.png";

// Fix for default marker icon
const defaultIcon = new L.Icon({
    iconUrl: markerIconPng,
    shadowUrl: markerShadowPng,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
});

// Custom Icons
const fieldUnitIcon = new L.DivIcon({
    className: 'custom-div-icon',
    html: `<div style="background-color: #3b82f6; width: 12px; height: 12px; border-radius: 50%; box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.4); animation: pulse 2s infinite;"></div>`,
    iconSize: [12, 12],
    iconAnchor: [6, 6]
});

const hotspotIcon = new L.DivIcon({
    className: 'custom-div-icon',
    html: `<div class="relative">
             <div class="absolute -top-6 -left-6 w-12 h-12 bg-red-500/30 rounded-full animate-ping"></div>
             <div class="absolute -top-3 -left-3 w-6 h-6 bg-red-600/50 rounded-full border-2 border-red-500"></div>
           </div>`,
    iconSize: [0, 0]
});

interface WarRoomMapProps {
    complaints: Complaint[];
}

const HeatmapLayer: React.FC<{ points: [number, number, number][] }> = ({ points }) => {
    const map = useMap();

    useEffect(() => {
        if (!points.length) return;

        const heat = (L as any).heatLayer(points, {
            radius: 25,
            blur: 15,
            maxZoom: 17,
            max: 1.0,
            gradient: {
                0.4: 'blue',
                0.6: 'cyan',
                0.7: 'lime',
                0.8: 'yellow',
                1.0: 'red'
            }
        }).addTo(map);

        return () => {
            map.removeLayer(heat);
        };
    }, [map, points]);

    return null;
};

const HotspotLayer: React.FC<{ complaints: Complaint[] }> = ({ complaints }) => {
    // Mark High Priority items as "Hotspots" for visual impact
    const hotspots = complaints.filter(c => c.priority === 'high' && c.status !== 'resolved');

    return (
        <>
            {hotspots.map(c => (
                <Marker
                    key={`hotspot-${c.id}`}
                    position={[c.location.lat, c.location.lng]}
                    icon={hotspotIcon}
                    zIndexOffset={-10}
                />
            ))}
        </>
    );
};

const FieldUnitMarker: React.FC<{ targets: Complaint[] }> = ({ targets }) => {
    const [position, setPosition] = useState<[number, number]>([20.5937, 78.9629]);
    const [targetIndex, setTargetIndex] = useState(0);

    useEffect(() => {
        // If no targets, just stay put or drift slightly
        if (targets.length === 0) return;

        const interval = setInterval(() => {
            setPosition(prev => {
                const target = targets[targetIndex];
                if (!target || !target.location) return prev;

                const destLat = target.location.lat;
                const destLng = target.location.lng;

                const dLat = destLat - prev[0];
                const dLng = destLng - prev[1];
                const dist = Math.sqrt(dLat * dLat + dLng * dLng);

                // Threshold to switch target
                if (dist < 0.0005) {
                    setTargetIndex(i => (i + 1) % targets.length);
                    return prev;
                }

                // Move towards target
                const speed = 0.0002; // Speed of movement
                return [
                    prev[0] + (dLat / dist) * speed,
                    prev[1] + (dLng / dist) * speed
                ];
            });
        }, 50); // 20fps update
        return () => clearInterval(interval);
    }, [targets, targetIndex]);

    return <Marker position={position} icon={fieldUnitIcon}><Popup>Field Unit #42 (Patrol)</Popup></Marker>;
};

export const WarRoomMap: React.FC<WarRoomMapProps> = ({ complaints }) => {
    const [heatmapMode, setHeatmapMode] = useState(true);

    // Filter valid locations
    const validComplaints = complaints.filter(c => c.location && c.location.lat && c.location.lng);

    // Prepare Heatmap Points: [lat, lng, intensity]
    const heatPoints = validComplaints.map(c => [
        c.location.lat,
        c.location.lng,
        c.priority === 'high' ? 1.0 : 0.5
    ] as [number, number, number]);

    // Center map on first complaint or default
    const center: [number, number] = validComplaints.length > 0
        ? [validComplaints[0].location.lat, validComplaints[0].location.lng]
        : [20.5937, 78.9629];

    return (
        <div className="relative h-full w-full">
            <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }}>
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                />

                {heatmapMode ? (
                    <>
                        <HeatmapLayer points={heatPoints} />
                        <HotspotLayer complaints={validComplaints} />
                    </>
                ) : (
                    validComplaints.map(c => (
                        <Marker
                            key={c.id}
                            position={[c.location.lat, c.location.lng]}
                            icon={defaultIcon}
                        >
                            <Popup>
                                <strong>{c.title}</strong><br />
                                {c.category} | {c.status}
                            </Popup>
                        </Marker>
                    ))
                )}

                <FieldUnitMarker targets={validComplaints} />
            </MapContainer>

            {/* Controls */}
            <div className="absolute top-4 right-4 z-[1000] bg-slate-900/90 backdrop-blur p-2 rounded-lg border border-white/10 shadow-xl flex flex-col gap-2">
                <div className="flex items-center justify-between gap-4">
                    <span className="text-xs font-medium text-white">Heatmap & Hotspots</span>
                    <button
                        onClick={() => setHeatmapMode(!heatmapMode)}
                        className={`w-10 h-5 rounded-full transition-colors relative ${heatmapMode ? 'bg-emerald-500' : 'bg-slate-600'}`}
                    >
                        <span className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${heatmapMode ? 'translate-x-5' : ''}`} />
                    </button>
                </div>
                <div className="text-[10px] text-slate-400 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                    Field Unit Active
                </div>
                {heatmapMode && (
                    <div className="text-[10px] text-slate-400 flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                        High Tension Zones
                    </div>
                )}
            </div>
        </div>
    );
};
