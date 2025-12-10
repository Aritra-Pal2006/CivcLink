import React, { useEffect, useState } from 'react';
import { getAdminComplaints, updateComplaint, type Complaint } from '../../services/complaintService';
import { Link } from 'react-router-dom';
import { Filter, Camera } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export const WardAdminDashboard: React.FC = () => {
    const { userProfile, currentUser } = useAuth();
    const [complaints, setComplaints] = useState<Complaint[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('all');
    const [lastDocId, setLastDocId] = useState<string | null>(null);
    const LIMIT = 20;

    // Resolution Modal State
    const [showResolveModal, setShowResolveModal] = useState(false);
    const [resolveProofFile, setResolveProofFile] = useState<File | null>(null);
    const [resolveNote, setResolveNote] = useState('');
    const [resolving, setResolving] = useState(false);
    const [selectedComplaintId, setSelectedComplaintId] = useState<string | null>(null);

    useEffect(() => {
        loadComplaints(false);
    }, [filterStatus, currentUser]);

    const loadComplaints = async (isLoadMore = false) => {
        if (!currentUser) return;
        try {
            setLoading(true);
            const token = await currentUser.getIdToken();
            // Backend enforces Ward filter based on userProfile
            const data = await getAdminComplaints({
                status: filterStatus,
                limit: LIMIT,
                startAfter: isLoadMore && lastDocId ? lastDocId : undefined
            }, token);

            if (isLoadMore) {
                setComplaints(prev => [...prev, ...data.complaints]);
            } else {
                setComplaints(data.complaints);
            }

            setLastDocId(data.lastDocId);

        } catch (error) {
            console.error("Failed to load complaints", error);
        } finally {
            setLoading(false);
        }
    };

    const handleStatusUpdate = async (id: string, newStatus: any) => {
        if (!currentUser) return;
        if (newStatus === 'resolved') {
            setSelectedComplaintId(id);
            setShowResolveModal(true);
            return;
        }

        try {
            const token = await currentUser.getIdToken();
            await updateComplaint(id, { status: newStatus }, token);
            setComplaints(complaints.map(c => c.id === id ? { ...c, status: newStatus } : c));
        } catch (error) {
            console.error("Failed to update status", error);
            alert("Failed to update status");
        }
    };

    const handleResolveSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedComplaintId || !resolveProofFile || !currentUser) return;

        setResolving(true);
        try {
            const token = await currentUser.getIdToken();
            const { uploadComplaintAttachment } = await import('../../services/complaintService');
            const result = await uploadComplaintAttachment(resolveProofFile, token);
            const { Timestamp } = await import('firebase/firestore');

            const proofData = {
                ...result,
                name: resolveProofFile.name,
                description: resolveNote,
                uploadedAt: Timestamp.now()
            };

            const deadline = new Date();
            deadline.setHours(deadline.getHours() + 48);

            await updateComplaint(selectedComplaintId, {
                status: 'pending_verification',
                resolutionProof: proofData,
                verificationDeadline: Timestamp.fromDate(deadline)
            }, token);

            setComplaints(complaints.map(c => c.id === selectedComplaintId ? {
                ...c,
                status: 'pending_verification',
                resolutionProof: proofData,
                verificationDeadline: Timestamp.fromDate(deadline)
            } : c));

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

    const getStatusBadge = (status: string) => {
        const styles = {
            submitted: 'bg-yellow-100 text-yellow-800',
            in_review: 'bg-blue-100 text-blue-800',
            in_progress: 'bg-indigo-100 text-indigo-800',
            resolved: 'bg-green-100 text-green-800',
            rejected: 'bg-red-100 text-red-800',
            pending_verification: 'bg-purple-100 text-purple-800',
            reopened: 'bg-orange-100 text-orange-800'
        };
        return (
            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${styles[status as keyof typeof styles] || 'bg-gray-100'}`}>
                {status.replace('_', ' ').toUpperCase()}
            </span>
        );
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-white drop-shadow-md">Ward Dashboard: {userProfile?.adminArea?.wardCode || 'Unassigned'}</h1>
                    <p className="text-primary-100">Manage complaints in your jurisdiction</p>
                </div>
                <div className="bg-white/10 px-4 py-2 rounded-lg backdrop-blur-md border border-white/20 text-white">
                    <span className="text-sm font-medium">Trust Score: </span>
                    <span className={`font-bold ${(userProfile?.trustScore || 100) < 50 ? 'text-red-300' : 'text-green-300'}`}>
                        {userProfile?.trustScore ?? 100}
                    </span>
                </div>
            </div>

            {/* Ward KPIs */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-4 mb-8">
                <div className="bg-white/10 backdrop-blur-md overflow-hidden shadow-lg rounded-lg p-5 border border-white/20">
                    <dt className="text-sm font-medium text-primary-200 truncate">Active Complaints</dt>
                    <dd className="mt-1 text-3xl font-semibold text-white">
                        {complaints.filter(c => !['resolved', 'rejected'].includes(c.status)).length}
                    </dd>
                </div>
                <div className="bg-white/10 backdrop-blur-md overflow-hidden shadow-lg rounded-lg p-5 border border-white/20">
                    <dt className="text-sm font-medium text-primary-200 truncate">Pending Verification</dt>
                    <dd className="mt-1 text-3xl font-semibold text-purple-300">
                        {complaints.filter(c => c.status === 'pending_verification').length}
                    </dd>
                </div>
                <div className="bg-white/10 backdrop-blur-md overflow-hidden shadow-lg rounded-lg p-5 border border-white/20">
                    <dt className="text-sm font-medium text-primary-200 truncate">Overdue</dt>
                    <dd className="mt-1 text-3xl font-semibold text-red-300">0</dd> {/* Mock for now */}
                </div>
                <div className="bg-white/10 backdrop-blur-md overflow-hidden shadow-lg rounded-lg p-5 border border-white/20">
                    <dt className="text-sm font-medium text-primary-200 truncate">Resolved Today</dt>
                    <dd className="mt-1 text-3xl font-semibold text-green-300">0</dd> {/* Mock for now */}
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white/10 backdrop-blur-md shadow-lg rounded-lg mb-6 p-4 flex items-center space-x-4 border border-white/20">
                <Filter className="h-5 w-5 text-primary-200" />
                <span className="text-sm font-medium text-white">Status:</span>
                <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="block w-48 pl-3 pr-10 py-2 text-base bg-white/10 border-white/20 text-white focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
                >
                    <option value="all" className="text-gray-900">All Active</option>
                    <option value="submitted" className="text-gray-900">Submitted</option>
                    <option value="in_progress" className="text-gray-900">In Progress</option>
                    <option value="pending_verification" className="text-gray-900">Pending Verification</option>
                    <option value="resolved" className="text-gray-900">Resolved</option>
                </select>
            </div>

            {/* Complaints Table */}
            <div className="bg-white/10 backdrop-blur-md shadow-lg overflow-hidden sm:rounded-lg border border-white/20">
                <table className="min-w-full divide-y divide-white/10">
                    <thead className="bg-white/10">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-primary-100 uppercase tracking-wider">ID / Title</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-primary-100 uppercase tracking-wider">Category</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-primary-100 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-primary-100 uppercase tracking-wider">Priority</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-primary-100 uppercase tracking-wider">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                        {loading && complaints.length === 0 ? (
                            <tr><td colSpan={5} className="px-6 py-4 text-center text-primary-200">Loading...</td></tr>
                        ) : complaints.map((complaint) => (
                            <tr key={complaint.id} className="hover:bg-white/10 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="text-sm font-medium text-white">{complaint.title}</div>
                                    <div className="text-xs text-primary-200">#{complaint.id?.slice(0, 8)}</div>
                                </td>
                                <td className="px-6 py-4 text-sm text-white">{complaint.category}</td>
                                <td className="px-6 py-4">{getStatusBadge(complaint.status)}</td>
                                <td className="px-6 py-4">
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize
                                        ${complaint.priority === 'high' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                                        {complaint.priority}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-sm font-medium">
                                    <div className="flex space-x-3">
                                        <Link to={`/complaints/${complaint.id}`} className="text-primary-300 hover:text-white">View</Link>
                                        {complaint.status !== 'resolved' && complaint.status !== 'pending_verification' && (
                                            <button
                                                onClick={() => handleStatusUpdate(complaint.id!, 'in_progress')}
                                                className="text-indigo-300 hover:text-indigo-100"
                                            >
                                                Start
                                            </button>
                                        )}
                                        {complaint.status === 'in_progress' && (
                                            <button
                                                onClick={() => handleStatusUpdate(complaint.id!, 'resolved')}
                                                className="text-green-300 hover:text-green-100 flex items-center"
                                            >
                                                <Camera className="h-4 w-4 mr-1" /> Resolve
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Resolve Modal */}
            {showResolveModal && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="flex items-center justify-center min-h-screen px-4">
                        <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={() => setShowResolveModal(false)}></div>
                        <div className="bg-white rounded-lg overflow-hidden shadow-xl transform transition-all sm:max-w-lg sm:w-full p-6 relative z-10">
                            <h3 className="text-lg font-medium text-gray-900 mb-4">Complete Resolution</h3>
                            <form onSubmit={handleResolveSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Proof Image</label>
                                    <input type="file" required onChange={(e) => setResolveProofFile(e.target.files?.[0] || null)} className="mt-1 block w-full" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Note</label>
                                    <textarea required value={resolveNote} onChange={(e) => setResolveNote(e.target.value)} className="mt-1 block w-full border rounded p-2" rows={3} />
                                </div>
                                <div className="flex justify-end space-x-3 mt-6">
                                    <button type="button" onClick={() => setShowResolveModal(false)} className="px-4 py-2 border rounded text-gray-700 hover:bg-gray-50">Cancel</button>
                                    <button type="submit" disabled={resolving} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50">
                                        {resolving ? 'Submitting...' : 'Submit Resolution'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
