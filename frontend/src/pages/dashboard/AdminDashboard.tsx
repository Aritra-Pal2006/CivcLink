import React, { useEffect, useState } from 'react';
import { getAdminComplaints, updateComplaint, type Complaint } from '../../services/complaintService';
import { Link } from 'react-router-dom';
import { Filter, CheckCircle, Clock, AlertTriangle, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { format } from 'date-fns';

export const AdminDashboard: React.FC = () => {
    const { userProfile, currentUser } = useAuth();
    const [complaints, setComplaints] = useState<Complaint[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterCategory, setFilterCategory] = useState('all');

    const [lastDocId, setLastDocId] = useState<string | null>(null);
    const [hasMore, setHasMore] = useState(true);
    const LIMIT = 20;

    useEffect(() => {
        loadComplaints(false);
    }, [filterStatus, filterCategory, currentUser]);

    const loadComplaints = async (isLoadMore = false) => {
        if (!currentUser) return;
        try {
            setLoading(true);
            const token = await currentUser.getIdToken();
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
            setHasMore(!!data.lastDocId && data.complaints.length === LIMIT);

        } catch (error) {
            console.error("Failed to load complaints", error);
        } finally {
            setLoading(false);
        }
    };

    const [showResolveModal, setShowResolveModal] = useState(false);
    const [resolveProofFile, setResolveProofFile] = useState<File | null>(null);
    const [resolveNote, setResolveNote] = useState('');
    const [resolving, setResolving] = useState(false);
    const [selectedComplaintId, setSelectedComplaintId] = useState<string | null>(null);

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
            // Optimistic update
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

            // Calculate deadline: Now + 48 hours
            const deadline = new Date();
            deadline.setHours(deadline.getHours() + 48);

            await updateComplaint(selectedComplaintId, {
                status: 'pending_verification',
                resolutionProof: proofData,
                verificationDeadline: Timestamp.fromDate(deadline)
            }, token);

            // Update local state
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

    // Client-side category filter (temporary until backend update)
    const filteredComplaints = complaints.filter(c => {
        // Status is already filtered by backend if not 'all'
        // But if we change filterStatus, we reload.
        // Category is NOT filtered by backend.
        const categoryMatch = filterCategory === 'all' || c.category === filterCategory;
        return categoryMatch;
    });

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

    const getPriorityIcon = (priority: string) => {
        if (priority === 'high') return <AlertTriangle className="h-4 w-4 text-red-500" />;
        if (priority === 'medium') return <Clock className="h-4 w-4 text-yellow-500" />;
        return <CheckCircle className="h-4 w-4 text-green-500" />;
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <h1 className="text-2xl font-bold text-white mb-8 drop-shadow-md">Admin Dashboard</h1>

            {/* Trust Score Card */}
            <div className={`mb-8 p-6 rounded-lg shadow-lg border backdrop-blur-md ${(userProfile?.trustScore || 100) >= 80 ? 'bg-green-500/10 border-green-500/30' :
                (userProfile?.trustScore || 100) >= 50 ? 'bg-yellow-500/10 border-yellow-500/30' :
                    'bg-red-500/10 border-red-500/30'
                }`}>
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className={`text-lg font-medium flex items-center ${(userProfile?.trustScore || 100) >= 80 ? 'text-green-200' :
                            (userProfile?.trustScore || 100) >= 50 ? 'text-yellow-200' :
                                'text-red-200'
                            }`}>
                            <ShieldCheck className="h-5 w-5 mr-2" />
                            Your Trust Score
                        </h2>
                        <p className="text-sm text-primary-200 mt-1">
                            Based on community verification of your resolutions.
                        </p>
                    </div>
                    <div className={`text-4xl font-bold ${(userProfile?.trustScore || 100) >= 80 ? 'text-green-300' :
                        (userProfile?.trustScore || 100) >= 50 ? 'text-yellow-300' :
                            'text-red-300'
                        }`}>
                        {userProfile?.trustScore ?? 100}
                    </div>
                </div>
                {(userProfile?.trustScore || 100) < 50 && (
                    <div className="mt-4 flex items-center text-sm text-red-200 bg-red-500/20 p-2 rounded border border-red-500/30">
                        <AlertTriangle className="h-4 w-4 mr-2" />
                        Warning: Your trust score is low. Your resolutions now require community verification.
                    </div>
                )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-4 mb-8">
                <div className="bg-white/10 backdrop-blur-md overflow-hidden shadow-lg rounded-lg p-5 border border-white/20">
                    <dt className="text-sm font-medium text-primary-200 truncate">Total Complaints</dt>
                    <dd className="mt-1 text-3xl font-semibold text-white">{complaints.length}</dd>
                </div>
                <div className="bg-white/10 backdrop-blur-md overflow-hidden shadow-lg rounded-lg p-5 border border-white/20">
                    <dt className="text-sm font-medium text-primary-200 truncate">Pending Review</dt>
                    <dd className="mt-1 text-3xl font-semibold text-yellow-300">
                        {complaints.filter(c => c.status === 'submitted' || c.status === 'in_review').length}
                    </dd>
                </div>
                <div className="bg-white/10 backdrop-blur-md overflow-hidden shadow-lg rounded-lg p-5 border border-white/20">
                    <dt className="text-sm font-medium text-primary-200 truncate">High Priority</dt>
                    <dd className="mt-1 text-3xl font-semibold text-red-300">
                        {complaints.filter(c => c.priority === 'high' && c.status !== 'resolved').length}
                    </dd>
                </div>
                <div className="bg-white/10 backdrop-blur-md overflow-hidden shadow-lg rounded-lg p-5 border border-white/20">
                    <dt className="text-sm font-medium text-primary-200 truncate">Resolved</dt>
                    <dd className="mt-1 text-3xl font-semibold text-green-300">
                        {complaints.filter(c => c.status === 'resolved').length}
                    </dd>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white/10 backdrop-blur-md shadow-lg rounded-lg mb-6 p-4 flex flex-wrap gap-4 border border-white/20">
                <div className="flex items-center space-x-2">
                    <Filter className="h-5 w-5 text-primary-200" />
                    <span className="text-sm font-medium text-white">Status:</span>
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="block w-full pl-3 pr-10 py-2 text-base bg-white/10 border-white/20 text-white focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
                    >
                        <option value="all" className="text-gray-900">All</option>
                        <option value="submitted" className="text-gray-900">Submitted</option>
                        <option value="in_review" className="text-gray-900">In Review</option>
                        <option value="in_progress" className="text-gray-900">In Progress</option>
                        <option value="resolved" className="text-gray-900">Resolved</option>
                        <option value="rejected" className="text-gray-900">Rejected</option>
                    </select>
                </div>
                <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-white">Category:</span>
                    <select
                        value={filterCategory}
                        onChange={(e) => setFilterCategory(e.target.value)}
                        className="block w-full pl-3 pr-10 py-2 text-base bg-white/10 border-white/20 text-white focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
                    >
                        <option value="all" className="text-gray-900">All</option>
                        <option value="Roads" className="text-gray-900">Roads</option>
                        <option value="Water" className="text-gray-900">Water</option>
                        <option value="Electricity" className="text-gray-900">Electricity</option>
                        <option value="Sanitation" className="text-gray-900">Sanitation</option>
                        <option value="Public Safety" className="text-gray-900">Public Safety</option>
                    </select>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white/10 backdrop-blur-md shadow-lg overflow-hidden sm:rounded-lg border border-white/20 flex flex-col">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-white/10">
                        <thead className="bg-white/10">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-primary-100 uppercase tracking-wider">
                                    Complaint
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-primary-100 uppercase tracking-wider">
                                    Category
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-primary-100 uppercase tracking-wider">
                                    Status
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-primary-100 uppercase tracking-wider">
                                    Priority
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-primary-100 uppercase tracking-wider">
                                    Date
                                </th>
                                <th scope="col" className="relative px-6 py-3">
                                    <span className="sr-only">Actions</span>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/10">
                            {loading && complaints.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-4 text-center text-sm text-primary-200">Loading...</td>
                                </tr>
                            ) : filteredComplaints.map((complaint) => (
                                <tr key={complaint.id} className="hover:bg-white/10 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center">
                                            <div>
                                                <div className="text-sm font-medium text-white">{complaint.title}</div>
                                                <div className="text-sm text-primary-200 truncate max-w-xs">{complaint.location?.address}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-white">{complaint.category}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {getStatusBadge(complaint.status)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            {getPriorityIcon(complaint.priority)}
                                            <span className="ml-2 text-sm text-primary-200 capitalize">{complaint.priority}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-primary-200">
                                        {complaint.createdAt ? format(complaint.createdAt.toDate(), 'MMM d') : '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <Link to={`/complaints/${complaint.id}`} className="text-primary-300 hover:text-white mr-4">
                                            View
                                        </Link>
                                        <select
                                            className="text-xs border-white/20 bg-white/10 text-white rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                                            value={complaint.status}
                                            onChange={(e) => handleStatusUpdate(complaint.id!, e.target.value)}
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <option value="submitted" className="text-gray-900">Submitted</option>
                                            <option value="in_review" className="text-gray-900">In Review</option>
                                            <option value="in_progress" className="text-gray-900">In Progress</option>
                                            <option value="resolved" className="text-gray-900">Resolved</option>
                                            <option value="rejected" className="text-gray-900">Rejected</option>
                                        </select>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {hasMore && (
                    <div className="p-4 flex justify-center border-t border-white/10">
                        <button
                            onClick={() => loadComplaints(true)}
                            disabled={loading}
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                        >
                            {loading ? 'Loading...' : 'Load More'}
                        </button>
                    </div>
                )}
            </div>

            {/* Resolve Modal */}
            {showResolveModal && (
                <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
                    <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={() => setShowResolveModal(false)}></div>
                        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
                        <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
                            <div>
                                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                                    <CheckCircle className="h-6 w-6 text-green-600" aria-hidden="true" />
                                </div>
                                <div className="mt-3 text-center sm:mt-5">
                                    <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">Complete Resolution</h3>
                                    <div className="mt-2">
                                        <p className="text-sm text-gray-500">
                                            To mark this complaint as resolved, please upload proof (photo/document) and add a short note.
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <form onSubmit={handleResolveSubmit} className="mt-5 sm:mt-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Proof of Completion (Required)</label>
                                    <input
                                        type="file"
                                        required
                                        onChange={(e) => setResolveProofFile(e.target.files?.[0] || null)}
                                        className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Resolution Note</label>
                                    <textarea
                                        required
                                        rows={3}
                                        value={resolveNote}
                                        onChange={(e) => setResolveNote(e.target.value)}
                                        className="mt-1 shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-gray-300 rounded-md"
                                        placeholder="Describe how the issue was resolved..."
                                    />
                                </div>
                                <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
                                    <button
                                        type="submit"
                                        disabled={resolving}
                                        className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-green-600 text-base font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 sm:col-start-2 sm:text-sm disabled:opacity-50"
                                    >
                                        {resolving ? 'Uploading...' : 'Submit Resolution'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setShowResolveModal(false)}
                                        className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:mt-0 sm:col-start-1 sm:text-sm"
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
    );
};
