import React, { useEffect, useState } from 'react';
import { getAdminComplaints, getAdminStats, type Complaint } from '../../services/complaintService'; // Use service instead of direct DB
import { useAuth } from '../../contexts/AuthContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { MapContainer, TileLayer, CircleMarker, Popup, GeoJSON, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import axios from 'axios';
import { Activity, AlertTriangle, CheckCircle, Shield, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

// --- STYLES FOR PULSING MARKERS ---
const pulsingIconStyle = `
  @keyframes pulse-red {
    0% {
      box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7);
    }
    70% {
      box-shadow: 0 0 0 10px rgba(239, 68, 68, 0);
    }
    100% {
      box-shadow: 0 0 0 0 rgba(239, 68, 68, 0);
    }
  }
  .leaflet-div-icon {
    background: transparent;
    border: none;
  }
`;

// Map Controller to handle auto-centering
const MapController = ({ complaints, adminLevel, wardGrid }: { complaints: Complaint[], adminLevel?: string, wardGrid?: any }) => {
    const map = useMap();

    useEffect(() => {
        console.log("🗺️ MapController Update:", { adminLevel, hasWardGrid: !!wardGrid, features: wardGrid?.features?.length });

        // Priority 1: Zoom to Ward Grid (if Ward Admin or just available)
        if (wardGrid && wardGrid.features && wardGrid.features.length > 0) {
            try {
                const layer = L.geoJSON(wardGrid);
                const bounds = layer.getBounds();
                console.log("🗺️ Ward Grid Bounds:", bounds, "IsValid:", bounds.isValid());

                if (bounds.isValid()) {
                    map.fitBounds(bounds, { padding: [50, 50] });
                    console.log("🗺️ Zooming to Ward Grid Bounds");
                    return;
                }
            } catch (e) {
                console.error("Error calculating grid bounds", e);
            }
        } else {
            console.log("🗺️ No Ward Grid features to zoom to.");
        }

        // Priority 2: Zoom to Complaints
        if (complaints.length === 0) return;


        // Calculate bounds
        let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
        let hasValidLoc = false;

        complaints.forEach(c => {
            if (c.location && c.location.lat && c.location.lng) {
                hasValidLoc = true;
                minLat = Math.min(minLat, c.location.lat);
                maxLat = Math.max(maxLat, c.location.lat);
                minLng = Math.min(minLng, c.location.lng);
                maxLng = Math.max(maxLng, c.location.lng);
            }
        });

        if (hasValidLoc) {
            const latPadding = (maxLat - minLat) * 0.1 || 0.01;
            const lngPadding = (maxLng - minLng) * 0.1 || 0.01;

            map.fitBounds([
                [minLat - latPadding, minLng - lngPadding],
                [maxLat + latPadding, maxLng + lngPadding]
            ]);
        }
    }, [complaints, map, adminLevel, wardGrid]);

    return null;
};

// Simple Heatmap simulation using CircleMarkers with opacity
const HeatmapLayer = ({ complaints }: { complaints: Complaint[] }) => {
    return (
        <>
            {complaints.map(c => (
                <CircleMarker
                    key={c.id}
                    center={[c.location.lat, c.location.lng]}
                    radius={c.priority === 'high' ? 15 : 8}
                    pathOptions={{
                        color: c.priority === 'high' ? '#ef4444' : '#3b82f6',
                        fillColor: c.priority === 'high' ? '#ef4444' : '#3b82f6',
                        fillOpacity: 0.6,
                        stroke: false,
                        className: c.priority === 'high' ? 'animate-pulse' : ''
                    }}
                >
                    <Popup>
                        <div className="text-slate-900">
                            <strong className="block text-sm">{c.title}</strong>
                            <span className="text-xs text-slate-500">{c.category} | {c.status}</span>
                        </div>
                    </Popup>
                </CircleMarker>
            ))}
        </>
    );
};

// Ward Grid Visualization
const WardGridLayer = ({ data }: { data: any }) => {
    if (!data || !data.features || data.features.length === 0) return null;

    return (
        <GeoJSON
            key="ward-grid" // Force re-render if data changes
            data={data}
            style={(feature) => ({
                color: '#3b82f6',
                weight: 2,
                fillColor: feature?.properties.fill || '#1e293b',
                fillOpacity: 0.1,
                dashArray: '3'
            })}
            onEachFeature={(feature, layer) => {
                layer.bindPopup(`
                    <div class="font-bold text-slate-900">Ward: ${feature.properties.wardCode}</div>
                    <div class="text-xs text-slate-600">Deterministic Zone</div>
                `);
            }}
        />
    );
};


class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: any }> {
    constructor(props: { children: React.ReactNode }) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: any) {
        return { hasError: true, error };
    }

    componentDidCatch(error: any, errorInfo: any) {
        console.error("AdminDashboard Error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="p-8 text-red-500 bg-slate-900 min-h-screen">
                    <h1 className="text-2xl font-bold mb-4">Dashboard Crashed</h1>
                    <pre className="bg-slate-800 p-4 rounded overflow-auto">
                        {this.state.error?.toString()}
                    </pre>
                </div>
            );
        }

        return this.props.children;
    }
}

const CITY_BOUNDS: Record<string, { minLat: number, minLng: number, maxLat: number, maxLng: number }> = {
    'Delhi': { minLat: 28.4, minLng: 76.8, maxLat: 28.9, maxLng: 77.5 },
    'Mumbai': { minLat: 18.8, minLng: 72.7, maxLat: 19.3, maxLng: 73.0 },
    'Bangalore': { minLat: 12.8, minLng: 77.4, maxLat: 13.1, maxLng: 77.8 },
    'Kolkata': { minLat: 22.4, minLng: 88.3, maxLat: 22.7, maxLng: 88.5 },
    'Chennai': { minLat: 12.9, minLng: 80.1, maxLat: 13.2, maxLng: 80.3 },
    'Hyderabad': { minLat: 17.3, minLng: 78.3, maxLat: 17.6, maxLng: 78.6 }
};

const AdminDashboardContent: React.FC = () => {
    const { userProfile } = useAuth();
    const [complaints, setComplaints] = useState<Complaint[]>([]);
    const [loading, setLoading] = useState(true);
    const [liveFeed, setLiveFeed] = useState<any[]>([]);
    const { t } = useTranslation();

    const [stats, setStats] = useState({
        total: 0,
        pending: 0,
        critical: 0,
        resolved: 0
    });
    const [wardGrid, setWardGrid] = useState<any>(null);
    const [selectedCity, setSelectedCity] = useState<string>('Delhi');

    // Initialize City from Profile
    useEffect(() => {
        if (userProfile) {
            const initialCity = (userProfile as any).assignedCity || userProfile.city || 'Delhi';
            setSelectedCity(initialCity);
        }
    }, [userProfile]);

    useEffect(() => {
        const fetchDashboardData = async () => {
            if (!userProfile) return;

            setLoading(true);
            try {
                // 1. Fetch Stats (Server-side aggregated)
                const serverStats = await getAdminStats();
                setStats(serverStats);

                // 2. Fetch Recent Complaints (for Table & Map)
                let data = await getAdminComplaints({ limit: 100 });
                setComplaints(data);

                // 3. Fetch Ward Grid
                // Use selectedCity state
                let city = selectedCity;

                // STRICT: If City Admin, ensure we use their assigned city
                if (userProfile?.adminLevel === 'city' && !city) {
                    console.warn("⚠️ City Admin without assigned city in profile. Falling back to inference.");
                }

                if (!city && data.length > 0) {
                    // Infer city from the first complaint's district
                    const firstLoc = data[0].location;
                    if (firstLoc?.districtName) {
                        if (firstLoc.districtName === 'Mumbai City' || firstLoc.districtName === 'MumbaiSuburban') city = 'Mumbai';
                        else if (firstLoc.stateName === 'NCTofDelhi') city = 'Delhi';
                        else city = firstLoc.districtName;
                        console.log(`🏙️ Inferred City from complaints: ${city}`);
                    }
                }

                city = city || 'Delhi'; // Fallback

                // Filter complaints for City Admin to ensure map purity
                if (userProfile?.adminLevel === 'city' && city) {
                    const filteredComplaints = data.filter((c: Complaint) => {
                        const dName = c.location?.districtName || '';
                        const sName = c.location?.stateName || '';
                        if (city === 'Mumbai') return dName.includes('Mumbai');
                        if (city === 'Delhi') return sName.includes('Delhi') || dName.includes('Delhi');
                        return dName.includes(city);
                    });

                    if (filteredComplaints.length !== data.length) {
                        console.log(`Filtered ${data.length - filteredComplaints.length} complaints outside assigned city ${city}`);
                        data = filteredComplaints;
                        setComplaints(data);
                    }
                }

                const bounds = CITY_BOUNDS[city] || CITY_BOUNDS['Delhi'];

                console.log(`Fetching grid for city: ${city}`, bounds);

                const gridRes = await axios.get('/api/geocode/wards', {
                    params: bounds
                });
                const gridData = gridRes.data;

                // Filter Grid if Ward Admin
                if (userProfile?.adminLevel === 'ward' && userProfile?.assignedWard) {
                    const targetWard = userProfile.assignedWard.trim();
                    console.log(`🎯 Filtering Grid for Ward Admin: ${targetWard}`);

                    const filtered = gridData.features.filter((f: any) =>
                        f.properties.wardCode === targetWard
                    );

                    if (filtered.length === 0) {
                        console.warn(`⚠️ Warning: No grid features found for ward ${targetWard}. Available wards:`, gridData.features.slice(0, 5).map((f: any) => f.properties.wardCode));
                    }

                    setWardGrid({ ...gridData, features: filtered });
                } else {
                    setWardGrid(gridData);
                }


                // Simulate live feed from recent complaints
                setLiveFeed(data.slice(0, 5).map((c: Complaint) => ({
                    id: c.id,
                    title: c.title,
                    status: c.status,
                    time: c.createdAt ? c.createdAt.toDate().toLocaleTimeString() : 'Just now'
                })));

            } catch (error) {
                console.error("Failed to fetch dashboard data", error);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();

        // Refresh interval for "Live" feel
        const interval = setInterval(fetchDashboardData, 30000);
        return () => clearInterval(interval);
    }, [userProfile, selectedCity]);

    const categoryData = Object.entries(complaints.reduce((acc, curr) => {
        acc[curr.category] = (acc[curr.category] || 0) + 1;
        return acc;
    }, {} as Record<string, number>)).map(([name, value]) => ({ name, value }));

    const statusData = Object.entries(complaints.reduce((acc, curr) => {
        acc[curr.status] = (acc[curr.status] || 0) + 1;
        return acc;
    }, {} as Record<string, number>)).map(([name, value]) => ({ name, value }));

    const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

    if (loading) return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center text-blue-500">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-current"></div>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 p-6 font-sans">
            <style>{pulsingIconStyle}</style>

            {/* Header / Command Bar */}
            <div className="flex justify-between items-center mb-8 border-b border-slate-800 pb-6">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
                        <Shield className="h-8 w-8 text-blue-500" />
                        CIVIC<span className="text-blue-500">LINK</span> {t('dashboard.title')}
                    </h1>
                    <p className="text-slate-400 text-sm mt-1 font-mono">
                        SYSTEM STATUS: <span className="text-green-400">OPERATIONAL</span> | LIVE MONITORING ACTIVE
                    </p>
                </div>

                <div className="flex items-center gap-4">
                    {userProfile?.adminLevel === 'ward' ? (
                        <span className="px-4 py-2 rounded-lg text-sm font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                            WARD COMMANDER: {userProfile.assignedWard || 'Unknown'}
                        </span>
                    ) : userProfile?.adminLevel === 'city' ? (
                        <div className="flex items-center gap-2">
                            <span className="px-4 py-2 rounded-lg text-sm font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                                CITY OVERSEER
                            </span>
                            <select
                                className="bg-slate-900 border border-slate-700 text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5"
                                value={selectedCity}
                                onChange={(e) => setSelectedCity(e.target.value)}
                            >
                                {Object.keys(CITY_BOUNDS).map(city => (
                                    <option key={city} value={city}>{city}</option>
                                ))}
                            </select>
                        </div>
                    ) : null}
                    <div className="h-3 w-3 rounded-full bg-red-500 animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.5)]"></div>
                </div>
            </div>

            {/* Main Grid */}
            <div className="grid grid-cols-12 gap-6">

                {/* Left Column: Stats & Feed (3 cols) */}
                <div className="col-span-12 lg:col-span-3 space-y-6">
                    {/* Quick Stats */}
                    <div className="grid grid-cols-1 gap-4">
                        <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 backdrop-blur-sm">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-xs text-slate-400 uppercase font-bold">{t('kpi.total')}</p>
                                    <h3 className="text-2xl font-bold text-white">{stats.total}</h3>
                                </div>
                                <Activity className="h-5 w-5 text-blue-500" />
                            </div>
                        </div>
                        <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 backdrop-blur-sm">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-xs text-slate-400 uppercase font-bold">{t('kpi.open')}</p>
                                    <h3 className="text-2xl font-bold text-yellow-500">
                                        {stats.pending}
                                    </h3>
                                </div>
                                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                            </div>
                        </div>
                        <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 backdrop-blur-sm">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-xs text-slate-400 uppercase font-bold">{t('kpi.overdue')}</p>
                                    <h3 className="text-2xl font-bold text-red-500">
                                        {stats.critical}
                                    </h3>
                                </div>
                                <AlertTriangle className="h-5 w-5 text-red-500" />
                            </div>
                        </div>
                        <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 backdrop-blur-sm">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-xs text-slate-400 uppercase font-bold">{t('kpi.resolved')}</p>
                                    <h3 className="text-2xl font-bold text-green-500">
                                        {stats.resolved}
                                    </h3>
                                </div>
                                <CheckCircle className="h-5 w-5 text-green-500" />
                            </div>
                        </div>
                    </div>

                    {/* Live Feed */}
                    <div className="bg-slate-900/80 rounded-xl border border-slate-800 overflow-hidden flex flex-col h-[400px]">
                        <div className="p-4 border-b border-slate-800 bg-slate-900">
                            <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                <Zap className="h-4 w-4 text-yellow-500" />
                                {t('livefeed.title')}
                            </h3>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
                            {liveFeed.map((item, idx) => (
                                <motion.div
                                    key={item.id + idx}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="p-3 bg-slate-800/50 rounded-lg border border-slate-700/50 hover:bg-slate-800 transition-colors"
                                >
                                    <div className="flex justify-between items-start mb-1">
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${item.status === 'resolved' ? 'bg-green-500/20 text-green-400' :
                                            item.status === 'rejected' ? 'bg-red-500/20 text-red-400' :
                                                'bg-blue-500/20 text-blue-400'
                                            }`}>
                                            {item.status}
                                        </span>
                                        <span className="text-[10px] text-slate-500 font-mono">{item.time}</span>
                                    </div>
                                    <p className="text-sm font-medium text-slate-200 line-clamp-2">{item.title}</p>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Middle Column: The War Map (6 cols) */}
                <div className="col-span-12 lg:col-span-6">
                    <div className="bg-slate-900 rounded-xl border border-slate-800 shadow-2xl overflow-hidden h-[600px] relative">
                        <div className="absolute top-4 left-4 z-[400] bg-slate-900/90 backdrop-blur px-3 py-1 rounded border border-slate-700 text-xs font-mono text-blue-400">
                            LIVE SATELLITE FEED :: ACTIVE
                        </div>
                        <MapContainer center={[28.6139, 77.2090]} zoom={11} style={{ height: '100%', width: '100%' }}>
                            <TileLayer
                                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                            />
                            <HeatmapLayer complaints={complaints} />
                            <WardGridLayer data={wardGrid} />
                            <MapController complaints={complaints} adminLevel={userProfile?.adminLevel} wardGrid={wardGrid} />
                        </MapContainer>
                    </div>
                </div>

                {/* Right Column: Analytics (3 cols) */}
                <div className="col-span-12 lg:col-span-3 space-y-6">
                    <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 h-[290px]">
                        <h3 className="text-sm font-bold text-slate-300 mb-4">ISSUE BREAKDOWN</h3>
                        <ResponsiveContainer width="100%" height="85%">
                            <PieChart>
                                <Pie
                                    data={categoryData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {categoryData.map((_, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f1f5f9' }}
                                    itemStyle={{ color: '#f1f5f9' }}
                                />
                                <Legend verticalAlign="bottom" height={36} iconType="circle" />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 h-[290px]">
                        <h3 className="text-sm font-bold text-slate-300 mb-4">STATUS VELOCITY</h3>
                        <ResponsiveContainer width="100%" height="85%">
                            <BarChart data={statusData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} />
                                <YAxis stroke="#94a3b8" fontSize={10} />
                                <Tooltip
                                    cursor={{ fill: '#334155', opacity: 0.2 }}
                                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f1f5f9' }}
                                />
                                <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                                    {statusData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.name === 'resolved' ? '#10b981' : '#3b82f6'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
};

export const AdminDashboardPage = () => (
    <ErrorBoundary>
        <AdminDashboardContent />
    </ErrorBoundary>
);

