import React, { useEffect, useState } from 'react';
import { getPublicFeed } from '../../services/complaintService';
import { format } from 'date-fns';
import { Shield, Activity, CheckCircle, Clock, AlertTriangle } from 'lucide-react';

interface AuditLogEntry {
    id: string;
    title: string;
    category: string;
    status: string;
    priority: string;
    district: string;
    ward: string;
    timestamp: { _seconds: number; _nanoseconds: number } | string;
    hash: string;
}

export const PublicAuditPage: React.FC = () => {
    const [feed, setFeed] = useState<AuditLogEntry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchFeed = async () => {
            try {
                const data = await getPublicFeed();
                setFeed(data);
            } catch (error) {
                console.error("Failed to load audit feed", error);
            } finally {
                setLoading(false);
            }
        };

        fetchFeed();
        // Refresh every 30 seconds
        const interval = setInterval(fetchFeed, 30000);
        return () => clearInterval(interval);
    }, []);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'resolved': return 'text-emerald-400';
            case 'rejected': return 'text-rose-400';
            case 'in_progress': return 'text-indigo-400';
            default: return 'text-amber-400';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'resolved': return <CheckCircle className="w-4 h-4 text-emerald-400" />;
            case 'rejected': return <AlertTriangle className="w-4 h-4 text-rose-400" />;
            case 'in_progress': return <Activity className="w-4 h-4 text-indigo-400" />;
            default: return <Clock className="w-4 h-4 text-amber-400" />;
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-200 font-mono">
            <div className="max-w-5xl mx-auto px-4 py-12">

                {/* Header */}
                <div className="text-center mb-12">
                    <div className="inline-flex items-center justify-center p-3 bg-emerald-500/10 rounded-full mb-4 ring-1 ring-emerald-500/30">
                        <Shield className="w-8 h-8 text-emerald-400" />
                    </div>
                    <h1 className="text-3xl font-bold text-white tracking-tight mb-2">Public Audit Log</h1>
                    <p className="text-slate-400">Immutable record of governance actions. Transparency by design.</p>
                </div>

                {/* Feed */}
                <div className="bg-slate-900/50 border border-white/10 rounded-xl overflow-hidden shadow-2xl backdrop-blur-sm">
                    <div className="px-6 py-4 border-b border-white/10 bg-white/5 flex justify-between items-center">
                        <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Live Transaction Feed</span>
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                            <span className="text-xs text-emerald-500 font-medium">System Online</span>
                        </div>
                    </div>

                    <div className="divide-y divide-white/5">
                        {loading ? (
                            <div className="p-8 text-center text-slate-500">Connecting to ledger...</div>
                        ) : feed.map((entry) => (
                            <div key={entry.id} className="p-4 hover:bg-white/5 transition-colors group">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex items-start gap-4">
                                        <div className="mt-1 opacity-50 font-mono text-xs text-slate-500 w-24">
                                            {typeof entry.timestamp === 'string'
                                                ? format(new Date(entry.timestamp), 'HH:mm:ss')
                                                : format(new Date(entry.timestamp._seconds * 1000), 'HH:mm:ss')
                                            }
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className={`font-bold text-sm ${getStatusColor(entry.status)} flex items-center gap-1.5`}>
                                                    {getStatusIcon(entry.status)}
                                                    {entry.status.toUpperCase()}
                                                </span>
                                                <span className="text-slate-600 text-xs">•</span>
                                                <span className="text-slate-300 text-sm font-medium">{entry.category}</span>
                                                {entry.priority === 'high' && (
                                                    <span className="px-1.5 py-0.5 bg-rose-500/20 text-rose-400 text-[10px] rounded border border-rose-500/20">HIGH PRIORITY</span>
                                                )}
                                            </div>
                                            <div className="text-sm text-slate-400 mb-1 group-hover:text-slate-200 transition-colors">
                                                {entry.title}
                                            </div>
                                            <div className="text-xs text-slate-600 font-mono">
                                                LOC: {entry.ward}, {entry.district}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right hidden sm:block">
                                        <div className="text-[10px] text-slate-600 font-mono mb-1">TX HASH</div>
                                        <div className="text-xs text-indigo-400/70 font-mono bg-indigo-500/5 px-2 py-1 rounded border border-indigo-500/10">
                                            0x{entry.hash}...
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="mt-8 text-center text-xs text-slate-600">
                    <p>CivicLink Open Governance Protocol v1.0.2</p>
                    <p className="mt-1">All records are cryptographically signed and immutable.</p>
                </div>
            </div>
        </div>
    );
};
