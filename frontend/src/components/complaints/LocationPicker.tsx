import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import { Icon } from 'leaflet';
import markerIconPng from "leaflet/dist/images/marker-icon.png";
import markerShadowPng from "leaflet/dist/images/marker-shadow.png";
import { Crosshair } from 'lucide-react';

// Fix for default marker icon in React Leaflet
const defaultIcon = new Icon({
    iconUrl: markerIconPng,
    shadowUrl: markerShadowPng,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
});

interface LocationPickerProps {
    onLocationSelect: (lat: number, lng: number, address: string) => void;
    initialLat?: number;
    initialLng?: number;
}

// Component to handle map view updates
const MapUpdater: React.FC<{ center: { lat: number; lng: number } | null }> = ({ center }) => {
    const map = useMap();
    useEffect(() => {
        if (center) {
            map.flyTo(center, 16);
        }
    }, [center, map]);
    return null;
};

const LocationMarker: React.FC<{
    position: { lat: number; lng: number } | null;
    onSelect: (lat: number, lng: number) => void;
}> = ({ position, onSelect }) => {
    useMapEvents({
        click(e) {
            onSelect(e.latlng.lat, e.latlng.lng);
        },
    });

    return position ? <Marker position={position} icon={defaultIcon} /> : null;
};

export const LocationPicker: React.FC<LocationPickerProps> = ({ onLocationSelect, initialLat = 20.5937, initialLng = 78.9629 }) => {
    const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null);
    const [address, setAddress] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleLocationSelect = async (lat: number, lng: number) => {
        setPosition({ lat, lng });
        setLoading(true);
        setError(null);
        try {
            // Reverse geocoding using Local Server Proxy (Nominatim)
            const response = await fetch(
                `${import.meta.env.VITE_API_BASE_URL}/geocode/reverse?lat=${lat}&lng=${lng}`
            );
            const data = await response.json();
            const addr = data.display_name || "Unknown Location";
            setAddress(addr);
            onLocationSelect(lat, lng, addr);
        } catch (error) {
            console.error("Geocoding failed", error);
            setAddress("Location selected (Address lookup failed)");
            onLocationSelect(lat, lng, "Location selected (Address lookup failed)");
        } finally {
            setLoading(false);
        }
    };

    const handleCurrentLocation = () => {
        if (!navigator.geolocation) {
            setError("Geolocation is not supported by your browser");
            return;
        }

        setLoading(true);
        setError(null);

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const { latitude, longitude } = pos.coords;
                handleLocationSelect(latitude, longitude);
            },
            (err) => {
                console.error("Geolocation error:", err);
                let errorMessage = "Unable to retrieve location.";
                if (err.code === 1) errorMessage = "Location permission denied.";
                else if (err.code === 2) errorMessage = "Location unavailable.";
                else if (err.code === 3) errorMessage = "Location request timed out.";

                setError(`${errorMessage} Please try again.`);
                setLoading(false);
            },
            {
                enableHighAccuracy: true,
                timeout: 15000,
                maximumAge: 0
            }
        );
    };

    return (
        <div className="space-y-2">
            <div className="flex flex-col items-end">
                <button
                    type="button"
                    onClick={handleCurrentLocation}
                    disabled={loading}
                    className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
                >
                    <Crosshair className="mr-1.5 h-4 w-4 text-gray-500" />
                    {loading ? 'Locating...' : 'Use Current Location'}
                </button>
                {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
            </div>

            <div className="h-64 w-full rounded-md overflow-hidden border border-gray-300 z-0 relative">
                <MapContainer
                    center={[initialLat, initialLng]}
                    zoom={5}
                    style={{ height: '100%', width: '100%' }}
                >
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <LocationMarker position={position} onSelect={handleLocationSelect} />
                    <MapUpdater center={position} />
                </MapContainer>
                {loading && (
                    <div className="absolute inset-0 bg-white bg-opacity-75 flex flex-col items-center justify-center z-[1000] space-y-2">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                        <span className="text-sm font-medium text-gray-700">Fetching location...</span>
                        <span className="text-xs text-gray-500">Please enable location services if prompted.</span>
                    </div>
                )}
            </div>
            {address && (
                <p className="text-sm text-gray-600">
                    <span className="font-medium">Selected:</span> {address}
                </p>
            )}
        </div>
    );
};
