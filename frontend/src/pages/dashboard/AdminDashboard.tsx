import React, { useEffect, useState, useRef } from 'react';
import { subscribeToAllComplaints, updateComplaint, resolveComplaint, type Complaint } from '../../services/complaintService';
import { Link } from 'react-router-dom';
import { Filter, CheckCircle, Map as MapIcon, List } from 'lucide-react';
import { format } from 'date-fns';
import { StatsGrid } from '../../components/dashboard/StatsGrid';
import { LiveFeed } from '../../components/dashboard/LiveFeed';
import { AIVerdictBadge } from '../../components/common/AIVerdictBadge';
import { WarRoomMap } from '../../components/dashboard/WarRoomMap';

export const AdminDashboard: React.FC = () => {
    const [complaints, setComplaints] = useState<Complaint[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterCategory, setFilterCategory] = useState('all');
    const [viewMode, setViewMode] = useState<'list' | 'map'>('list');

    // Audio Ref for Ping
    const audioContextRef = useRef<AudioContext | null>(null);
    const prevCountRef = useRef(0);

    useEffect(() => {
        // Initialize Audio Context
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();

        const unsubscribe = subscribeToAllComplaints((data) => {
            setComplaints(data);
            setLoading(false);

            // Audio Ping on New Complaint
            if (prevCountRef.current > 0 && data.length > prevCountRef.current) {
                playPing();
            }
            prevCountRef.current = data.length;
        });

        return () => unsubscribe();
    }, []);

    const playPing = () => {
        if (!audioContextRef.current) return;
        const ctx = audioContextRef.current;
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(880, ctx.currentTime); // A5
        oscillator.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.1);

        gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);

        oscillator.start();
        oscillator.stop(ctx.currentTime + 0.1);
    };

    const [showResolveModal, setShowResolveModal] = useState(false);
    const [resolveProofFile, setResolveProofFile] = useState<File | null>(null);
    const [resolveNote, setResolveNote] = useState('');
    const [resolving, setResolving] = useState(false);
    const [selectedComplaintId, setSelectedComplaintId] = useState<string | null>(null);
    const [selectedComplaintImage, setSelectedComplaintImage] = useState<string | null>(null);

    const handleStatusUpdate = async (id: string, newStatus: any) => {
        if (newStatus === 'resolved') {
            setSelectedComplaintId(id);
            // Find complaint to get image
            const complaint = complaints.find(c => c.id === id);
            // Check for 'url' (standard) or 'webViewLink' (drive)
            const originalImg = complaint?.attachments?.find(a => a.type === 'image' || !a.type)?.url ||
                complaint?.attachments?.find(a => a.type === 'image' || !a.type)?.webViewLink || null;
            setSelectedComplaintImage(originalImg);

            setShowResolveModal(true);
            return;
        }

        try {
            await updateComplaint(id, { status: newStatus });
        } catch (error) {
            console.error("Failed to update status", error);
            alert("Failed to update status");
        }
    };

    const handleResolveSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedComplaintId || !resolveProofFile) return;

        setResolving(true);
        try {
            const { uploadComplaintAttachment } = await import('../../services/complaintService');
            const result = await uploadComplaintAttachment(resolveProofFile);
            const { Timestamp } = await import('firebase/firestore');

            const proofData = {
                ...result,
                name: resolveProofFile.name,
                description: resolveNote,
                uploadedAt: Timestamp.now()
            };

            await resolveComplaint(selectedComplaintId, proofData);

            setShowResolveModal(false);
            setResolveProofFile(null);
            setResolveNote('');
            setSelectedComplaintId(null);
        } catch (error) {
            console.error("Failed to resolve", error);
            alert("Failed to submit resolution proof");
        } finally {
            setResolving(false);
        }
    };

    const filteredComplaints = complaints.filter(c => {
        const statusMatch = filterStatus === 'all' || c.status === filterStatus;
        const categoryMatch = filterCategory === 'all' || c.category === filterCategory;
        return statusMatch && categoryMatch;
    });

    const getStatusBadge = (status: string) => {
        const styles = {
            submitted: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
            in_review: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
            in_progress: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
            resolved: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
            rejected: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
            reopened: 'bg-orange-500/10 text-orange-500 border-orange-500/20'
        };
        return (
            <span className={`px-2.5 py-0.5 inline-flex text-xs font-medium rounded-full border ${styles[status as keyof typeof styles] || 'bg-gray-100'}`}>
                {status.replace('_', ' ').toUpperCase()}
            </span>
        );
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-200 font-sans">
            <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">

                {/* Header */}
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
                            City Command Center
                            <span className="flex h-3 w-3 relative">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                            </span>
                        </h1>
                        <p className="text-slate-400 mt-1">Real-time Governance Monitoring System</p>
                    </div>
                    <div className="flex gap-3">
                        <div className="bg-slate-900/50 p-1 rounded-lg border border-white/10 flex">
                            <button
                                onClick={() => setViewMode('list')}
                                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'list' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                            >
                                <List className="w-4 h-4 inline mr-2" /> List
                            </button>
                            <button
                                onClick={() => setViewMode('map')}
                                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'map' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                            >
                                <MapIcon className="w-4 h-4 inline mr-2" /> War Room Map
                            </button>
                        </div>
                    </div>
                </div>

                {/* Stats Grid */}
                <StatsGrid complaints={complaints} />

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* Main Content Area */}
                    <div className="lg:col-span-3 space-y-6">

                        {/* Filters */}
                        <div className="bg-slate-900/60 backdrop-blur-md p-4 rounded-xl border border-white/10 flex flex-wrap gap-4 items-center justify-between">
                            <div className="flex gap-4">
                                <div className="flex items-center gap-2">
                                    <Filter className="w-4 h-4 text-slate-400" />
                                    <select
                                        value={filterStatus}
                                        onChange={(e) => setFilterStatus(e.target.value)}
                                        className="bg-slate-800 border-none text-sm rounded-lg focus:ring-indigo-500 text-white py-1.5 pl-3 pr-8"
                                    >
                                        <option value="all">All Status</option>
                                        <option value="submitted">Submitted</option>
                                        <option value="in_progress">In Progress</option>
                                        <option value="resolved">Resolved</option>
                                    </select>
                                </div>
                                <select
                                    value={filterCategory}
                                    onChange={(e) => setFilterCategory(e.target.value)}
                                    className="bg-slate-800 border-none text-sm rounded-lg focus:ring-indigo-500 text-white py-1.5 pl-3 pr-8"
                                >
                                    <option value="all">All Categories</option>
                                    <option value="Roads">Roads</option>
                                    <option value="Water">Water</option>
                                    <option value="Electricity">Electricity</option>
                                </select>
                            </div>
                            <div className="text-xs text-slate-500">
                                Showing {filteredComplaints.length} records
                            </div>
                        </div>

                        {/* View Content */}
                        {viewMode === 'list' ? (
                            <div className="bg-slate-900/60 backdrop-blur-md rounded-xl border border-white/10 overflow-hidden shadow-xl">
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-white/5">
                                        <thead className="bg-white/5">
                                            <tr>
                                                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Issue</th>
                                                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">AI Analysis</th>
                                                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                                                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Time</th>
                                                <th scope="col" className="relative px-6 py-4"><span className="sr-only">Actions</span></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {loading ? (
                                                <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-500">Loading live data...</td></tr>
                                            ) : filteredComplaints.map((complaint) => (
                                                <tr
                                                    key={complaint.id}
                                                    className={`hover:bg-white/5 transition-colors group ${complaint.priority === 'high' && complaint.status !== 'resolved' ? 'bg-rose-500/5' : ''}`}
                                                >
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center">
                                                            <div>
                                                                <div className="text-sm font-medium text-white group-hover:text-indigo-300 transition-colors">
                                                                    {complaint.title}
                                                                </div>
                                                                <div className="text-xs text-slate-500 truncate max-w-[200px]">
                                                                    {complaint.location?.address}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <AIVerdictBadge
                                                            category={complaint.category}
                                                            priority={complaint.priority}
                                                            aiSummary={complaint.aiSummary}
                                                        />
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        {getStatusBadge(complaint.status)}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400 font-mono">
                                                        {complaint.createdAt ? format(complaint.createdAt.toDate(), 'HH:mm') : '-'}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                        <Link to={`/complaints/${complaint.id}`} className="text-indigo-400 hover:text-indigo-300 mr-4">
                                                            View
                                                        </Link>
                                                        <select
                                                            className="text-xs bg-slate-800 border-white/10 text-white rounded focus:ring-indigo-500"
                                                            value={complaint.status}
                                                            onChange={(e) => handleStatusUpdate(complaint.id!, e.target.value)}
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            <option value="submitted">Submitted</option>
                                                            <option value="in_progress">In Progress</option>
                                                            <option value="resolved">Resolved</option>
                                                            <option value="rejected">Rejected</option>
                                                        </select>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-slate-900/60 backdrop-blur-md rounded-xl border border-white/10 overflow-hidden shadow-xl h-[600px] relative">
                                <WarRoomMap complaints={complaints} />
                            </div>
                        )}
                    </div>

                    {/* Sidebar: Live Feed */}
                    <div className="lg:col-span-1">
                        <LiveFeed complaints={complaints} />
                    </div>
                </div>

                {/* Resolve Modal */}
                {showResolveModal && (
                    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
                        <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                            <div className="fixed inset-0 bg-black/80 transition-opacity" aria-hidden="true" onClick={() => setShowResolveModal(false)}></div>
                            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
                            <div className="inline-block align-bottom bg-slate-900 border border-white/10 rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
                                <div>
                                    <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-emerald-500/20">
                                        <CheckCircle className="h-6 w-6 text-emerald-500" aria-hidden="true" />
                                    </div>
                                    <div className="mt-3 text-center sm:mt-5">
                                        <h3 className="text-lg leading-6 font-medium text-white" id="modal-title">Complete Resolution</h3>
                                        <div className="mt-2">
                                            <p className="text-sm text-slate-400">
                                                Upload proof to mark this as resolved.
                                            </p>
                                        </div>
                                    </div>

                                    {/* Comparison View */}
                                    <div className="mt-4 grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-medium text-slate-400 mb-1">Before (Complaint)</label>
                                            <div className="aspect-video bg-black/20 rounded-lg overflow-hidden border border-white/5 flex items-center justify-center relative group">
                                                {selectedComplaintImage ? (
                                                    <img src={selectedComplaintImage} alt="Before" className="w-full h-full object-cover" />
                                                ) : (
                                                    <span className="text-xs text-slate-600">No original image</span>
                                                )}
                                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <span className="text-xs text-white font-medium">Original Issue</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-400 mb-1">After (Resolution)</label>
                                            <div className="aspect-video bg-black/20 rounded-lg overflow-hidden border border-white/5 flex items-center justify-center relative group">
                                                {resolveProofFile ? (
                                                    <img src={URL.createObjectURL(resolveProofFile)} alt="After" className="w-full h-full object-cover" />
                                                ) : (
                                                    <span className="text-xs text-slate-600">Upload proof...</span>
                                                )}
                                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <span className="text-xs text-emerald-400 font-medium">Fixed</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <form onSubmit={handleResolveSubmit} className="mt-5 sm:mt-6 space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300">Proof of Completion</label>
                                        <input
                                            type="file"
                                            required
                                            onChange={(e) => setResolveProofFile(e.target.files?.[0] || null)}
                                            className="mt-1 block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-500/10 file:text-indigo-400 hover:file:bg-indigo-500/20"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300">Note</label>
                                        <textarea
                                            required
                                            rows={3}
                                            value={resolveNote}
                                            onChange={(e) => setResolveNote(e.target.value)}
                                            className="mt-1 bg-slate-800 border-white/10 text-white block w-full sm:text-sm rounded-md focus:ring-indigo-500"
                                            placeholder="Resolution details..."
                                        />
                                    </div>
                                    <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
                                        <button
                                            type="submit"
                                            disabled={resolving}
                                            className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-emerald-600 text-base font-medium text-white hover:bg-emerald-700 focus:outline-none sm:col-start-2 sm:text-sm disabled:opacity-50"
                                        >
                                            {resolving ? 'Uploading...' : 'Submit'}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setShowResolveModal(false)}
                                            className="mt-3 w-full inline-flex justify-center rounded-md border border-white/10 shadow-sm px-4 py-2 bg-white/5 text-base font-medium text-slate-300 hover:bg-white/10 focus:outline-none sm:mt-0 sm:col-start-1 sm:text-sm"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
