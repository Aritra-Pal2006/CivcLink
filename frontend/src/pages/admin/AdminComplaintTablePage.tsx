import React, { useEffect, useState } from 'react';
import { type Complaint, getAdminComplaints, updateComplaint, resolveComplaint } from '../../services/complaintService';
import AdminFilters from '../../components/AdminFilters';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { Timestamp } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { ChevronDown, ChevronRight, Users, AlertTriangle } from 'lucide-react';

export const AdminComplaintTablePage: React.FC = () => {
    const { userProfile } = useAuth();
    const [complaints, setComplaints] = useState<Complaint[]>([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState<{ status: string; priority: string; ward?: string }>({ status: '', priority: '', ward: '' });
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

    useEffect(() => {
        const fetchComplaints = async () => {
            setLoading(true);
            try {
                const data = await getAdminComplaints(filters);
                setComplaints(data);
            } catch (error) {
                console.error("Error fetching complaints:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchComplaints();
    }, [filters]);

    const [showRejectModal, setShowRejectModal] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');
    const [rejecting, setRejecting] = useState(false);

    // Restore missing state
    const [showResolveModal, setShowResolveModal] = useState(false);
    const [resolveProofFile, setResolveProofFile] = useState<File | null>(null);
    const [resolveNote, setResolveNote] = useState('');
    const [resolving, setResolving] = useState(false);
    const [selectedComplaintId, setSelectedComplaintId] = useState<string | null>(null);

    const handleStatusChange = async (id: string, newStatus: string) => {
        if (newStatus === 'resolved') {
            setSelectedComplaintId(id);
            setShowResolveModal(true);
            return;
        }
        if (newStatus === 'rejected') {
            setSelectedComplaintId(id);
            setShowRejectModal(true);
            return;
        }

        try {
            await updateComplaint(id, { status: newStatus as any });
            setComplaints(complaints.map(c => c.id === id ? { ...c, status: newStatus as any } : c));
        } catch (error) {
            console.error("Error updating status:", error);
            alert("Failed to update status");
        }
    };

    const handleRejectSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedComplaintId || !rejectionReason) return;

        setRejecting(true);
        try {
            await updateComplaint(selectedComplaintId, {
                status: 'rejected',
                rejectionReason: rejectionReason
            });

            setComplaints(complaints.map(c => c.id === selectedComplaintId ? {
                ...c,
                status: 'rejected',
                rejectionReason: rejectionReason
            } : c));

            setShowRejectModal(false);
            setRejectionReason('');
            setSelectedComplaintId(null);
        } catch (error) {
            console.error("Failed to reject", error);
            alert("Failed to reject complaint");
        } finally {
            setRejecting(false);
        }
    };

    const handleResolveSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedComplaintId || !resolveProofFile) return;

        setResolving(true);
        try {
            // Capture Admin Location
            let adminLocation = null;
            try {
                const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
                    navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
                });
                adminLocation = {
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude
                };
            } catch (geoError) {
                console.warn("Could not get admin location", geoError);
            }

            const { uploadComplaintAttachment } = await import('../../services/complaintService');
            const result = await uploadComplaintAttachment(resolveProofFile);

            const proofData = {
                ...result,
                name: resolveProofFile.name,
                description: resolveNote,
                uploadedAt: Timestamp.now()
            };

            await resolveComplaint(selectedComplaintId, proofData, adminLocation);

            setComplaints(complaints.map(c => c.id === selectedComplaintId ? {
                ...c,
                status: 'resolved',
                resolutionProof: proofData,
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

    const toggleGroup = (id: string) => {
        const newExpanded = new Set(expandedGroups);
        if (newExpanded.has(id)) {
            newExpanded.delete(id);
        } else {
            newExpanded.add(id);
        }
        setExpandedGroups(newExpanded);
    };

    // Filter Logic for UI Grouping
    const primaryComplaints = complaints.filter(c => !c.duplicateOf);
    const getDuplicates = (parentId: string) => complaints.filter(c => c.duplicateOf === parentId);

    if (loading) return <div className="p-8 text-center">Loading...</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Manage Complaints</h1>
                    {userProfile?.adminLevel === 'ward' && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mt-1">
                            Ward View: {userProfile.assignedWard || 'Assigned Ward'}
                        </span>
                    )}
                </div>
            </div>

            {/* Hide City Filters for Ward Admins */}
            {userProfile?.adminLevel !== 'ward' && (
                <AdminFilters filters={filters} onFilterChange={setFilters} />
            )}

            <div className="bg-white/10 backdrop-blur-md shadow-xl overflow-hidden sm:rounded-lg border border-white/20">
                <table className="min-w-full divide-y divide-white/10">
                    <thead className="bg-white/5">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-primary-200 uppercase tracking-wider">
                                Title
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-primary-200 uppercase tracking-wider">
                                Category
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-primary-200 uppercase tracking-wider">
                                Reporter
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-primary-200 uppercase tracking-wider">
                                Ward
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-primary-200 uppercase tracking-wider">
                                Status
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-primary-200 uppercase tracking-wider">
                                Date
                            </th>
                            {userProfile?.adminLevel !== 'city' && (
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-primary-200 uppercase tracking-wider">
                                    Actions
                                </th>
                            )}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                        {primaryComplaints.map((complaint) => {
                            const duplicates = getDuplicates(complaint.id!);
                            const isExpanded = expandedGroups.has(complaint.id!);
                            const hasDuplicates = duplicates.length > 0;

                            return (
                                <React.Fragment key={complaint.id}>
                                    <tr className={clsx("hover:bg-white/5 transition-colors", hasDuplicates && "bg-white/5")}>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                {hasDuplicates && (
                                                    <button onClick={() => toggleGroup(complaint.id!)} className="mr-2 text-primary-300 hover:text-white">
                                                        {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                                    </button>
                                                )}
                                                <div>
                                                    <div className="text-sm font-medium text-white flex items-center">
                                                        <Link to={`/complaints/${complaint.id}`} className="hover:text-primary-300 transition-colors">
                                                            {complaint.title}
                                                        </Link>
                                                        {complaint.supportCount && complaint.supportCount > 1 && (
                                                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                                                                <Users className="h-3 w-3 mr-1" />
                                                                {complaint.supportCount} Supporters
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="text-sm text-primary-200 truncate max-w-xs">{complaint.description}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-white/10 text-primary-100 border border-white/20">
                                                {complaint.category}
                                            </span>

                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-primary-200">
                                            {complaint.isAnonymous ? (
                                                <span className="italic text-gray-400">Anonymous ({complaint.anonymousDisplayId || 'Hidden'})</span>
                                            ) : (
                                                <span>User: {complaint.userId.slice(0, 6)}...</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-primary-200">
                                            {complaint.location?.wardCode || <span className="text-gray-500 italic">N/A</span>}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center space-x-2">
                                                <span className={clsx("px-2 inline-flex text-xs leading-5 font-semibold rounded-full capitalize border",
                                                    complaint.status === 'resolved' ? 'bg-green-500/20 text-green-100 border-green-500/30' :
                                                        complaint.status === 'reopened' ? 'bg-red-500/20 text-red-100 border-red-500/30' :
                                                            complaint.status === 'rejected' ? 'bg-gray-500/20 text-gray-100 border-gray-500/30 line-through' :
                                                                'bg-yellow-500/20 text-yellow-100 border-yellow-500/30')}>
                                                    {complaint.status.replace('_', ' ')}
                                                </span>
                                                {complaint.isOverdue && (
                                                    <span className="px-2 inline-flex text-xs leading-5 font-bold rounded-full bg-red-600 text-white animate-pulse flex items-center">
                                                        <AlertTriangle className="h-3 w-3 mr-1" />
                                                        OVERDUE
                                                    </span>
                                                )}
                                                {/* Escalation Warning for Ward Admin */}
                                                {complaint.escalationTriggered && userProfile?.adminLevel === 'ward' && (
                                                    <span className="px-2 inline-flex text-xs leading-5 font-bold rounded-full bg-orange-600 text-white border border-orange-500">
                                                        ESCALATED
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-primary-200">
                                            {complaint.createdAt ? format(complaint.createdAt.toDate(), 'MMM d, yyyy') : 'N/A'}
                                        </td>
                                        {userProfile?.adminLevel !== 'city' && (
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                <select
                                                    value={complaint.status}
                                                    onChange={(e) => handleStatusChange(complaint.id!, e.target.value)}
                                                    disabled={complaint.escalationTriggered && userProfile?.adminLevel === 'ward'} // Lock if escalated
                                                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base bg-black/20 border-white/20 text-white focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    <option value="submitted" className="text-gray-900">Submitted</option>
                                                    <option value="in_progress" className="text-gray-900">In Progress</option>
                                                    <option value="resolved" className="text-gray-900">Resolved</option>
                                                    <option value="rejected" className="text-gray-900">Rejected</option>
                                                </select>
                                                {complaint.escalationTriggered && userProfile?.adminLevel === 'ward' && (
                                                    <p className="text-xs text-red-300 mt-1">Locked by City Admin</p>
                                                )}
                                            </td>
                                        )}
                                    </tr>
                                    {/* Render Duplicates if Expanded */}
                                    {isExpanded && duplicates.map(dup => (
                                        <tr key={dup.id} className="bg-white/5">
                                            <td className="px-6 py-2 whitespace-nowrap pl-12 border-l-4 border-purple-500/50">
                                                <div className="text-sm text-primary-300 flex items-center">
                                                    <span className="mr-2 text-xs bg-purple-500/20 px-1 rounded">Duplicate</span>
                                                    <Link to={`/complaints/${dup.id}`} className="hover:text-white">
                                                        {dup.title}
                                                    </Link>
                                                </div>
                                            </td>
                                            <td className="px-6 py-2 whitespace-nowrap text-sm text-primary-300">
                                                {dup.category}
                                            </td>
                                            <td className="px-6 py-2 whitespace-nowrap text-sm text-primary-300">
                                                {dup.isAnonymous ? 'Anonymous' : dup.userId.slice(0, 6)}
                                            </td>
                                            <td className="px-6 py-2 whitespace-nowrap text-sm text-primary-300">
                                                {/* Ward for duplicate (usually same as parent, but can show) */}
                                                {dup.location?.wardCode || '-'}
                                            </td>
                                            <td className="px-6 py-2 whitespace-nowrap text-sm text-primary-300">
                                                {dup.status}
                                            </td>
                                            <td className="px-6 py-2 whitespace-nowrap text-sm text-primary-300">
                                                {dup.createdAt ? format(dup.createdAt.toDate(), 'MMM d') : '-'}
                                            </td>
                                            <td className="px-6 py-2 whitespace-nowrap text-sm text-primary-300">
                                                <span className="text-xs italic">Auto-linked</span>
                                            </td>
                                        </tr>
                                    ))}
                                </React.Fragment>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Resolve Modal */}
            {
                showResolveModal && (
                    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
                        <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={() => setShowResolveModal(false)}></div>
                            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
                            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
                                <div>
                                    <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                                        <svg className="h-6 w-6 text-green-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                        </svg>
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
                )
            }

            {/* Reject Modal */}
            {
                showRejectModal && (
                    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
                        <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={() => setShowRejectModal(false)}></div>
                            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
                            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
                                <div>
                                    <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                                        <AlertTriangle className="h-6 w-6 text-red-600" />
                                    </div>
                                    <div className="mt-3 text-center sm:mt-5">
                                        <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">Reject Complaint</h3>
                                        <div className="mt-2">
                                            <p className="text-sm text-gray-500">
                                                Please provide a reason for rejecting this complaint. This will be visible to the citizen.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                <form onSubmit={handleRejectSubmit} className="mt-5 sm:mt-6 space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Rejection Reason (Required)</label>
                                        <textarea
                                            required
                                            rows={3}
                                            value={rejectionReason}
                                            onChange={(e) => setRejectionReason(e.target.value)}
                                            className="mt-1 shadow-sm focus:ring-red-500 focus:border-red-500 block w-full sm:text-sm border-gray-300 rounded-md"
                                            placeholder="e.g., Duplicate, Invalid Location, Not a Civic Issue..."
                                        />
                                    </div>
                                    <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
                                        <button
                                            type="submit"
                                            disabled={rejecting}
                                            className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:col-start-2 sm:text-sm disabled:opacity-50"
                                        >
                                            {rejecting ? 'Rejecting...' : 'Confirm Rejection'}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setShowRejectModal(false)}
                                            className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:mt-0 sm:col-start-1 sm:text-sm"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
};
