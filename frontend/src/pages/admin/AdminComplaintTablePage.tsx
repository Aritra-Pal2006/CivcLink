import React, { useEffect, useState } from 'react';
import { updateDoc, doc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { type Complaint, getAdminComplaints, updateComplaint } from '../../services/complaintService';
import AdminFilters from '../../components/AdminFilters';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import clsx from 'clsx';

export const AdminComplaintTablePage: React.FC = () => {
    const [complaints, setComplaints] = useState<Complaint[]>([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState<{ status: string; priority: string; state?: string; district?: string }>({ status: '', priority: '', state: '', district: '' });

    useEffect(() => {
        const fetchComplaints = async () => {
            setLoading(true);
            try {
                const data = await getAdminComplaints(filters);
                setComplaints(data.complaints);
            } catch (error) {
                console.error("Error fetching complaints:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchComplaints();
    }, [filters]);

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

        try {
            await updateComplaint(id, { status: newStatus as any });
            setComplaints(complaints.map(c => c.id === id ? { ...c, status: newStatus as any } : c));
        } catch (error) {
            console.error("Error updating status:", error);
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

            const deadline = new Date();
            deadline.setHours(deadline.getHours() + 48);

            await updateDoc(doc(db, 'complaints', selectedComplaintId), {
                status: 'pending_verification',
                resolutionProof: proofData,
                verificationDeadline: Timestamp.fromDate(deadline),
                updatedAt: Timestamp.now()
            });

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

    if (loading) return <div className="p-8 text-center">Loading...</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-900">Manage Complaints</h1>
            </div>

            <AdminFilters filters={filters} onFilterChange={setFilters} />

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
                                Status
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-primary-200 uppercase tracking-wider">
                                Date
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-primary-200 uppercase tracking-wider">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                        {complaints.map((complaint) => (
                            <tr key={complaint.id} className="hover:bg-white/5 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-medium text-white">
                                        <Link to={`/complaints/${complaint.id}`} className="hover:text-primary-300 transition-colors">
                                            {complaint.title}
                                        </Link>
                                    </div>
                                    <div className="text-sm text-primary-200 truncate max-w-xs">{complaint.description}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-white/10 text-primary-100 border border-white/20">
                                        {complaint.category}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={clsx("px-2 inline-flex text-xs leading-5 font-semibold rounded-full capitalize border",
                                        complaint.status === 'resolved' ? 'bg-green-500/20 text-green-100 border-green-500/30' :
                                            complaint.status === 'rejected' ? 'bg-red-500/20 text-red-100 border-red-500/30' :
                                                'bg-yellow-500/20 text-yellow-100 border-yellow-500/30')}>
                                        {complaint.status.replace('_', ' ')}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-primary-200">
                                    {complaint.createdAt ? format(complaint.createdAt.toDate(), 'MMM d, yyyy') : 'N/A'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                    <select
                                        value={complaint.status}
                                        onChange={(e) => handleStatusChange(complaint.id!, e.target.value)}
                                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base bg-black/20 border-white/20 text-white focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
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

            {/* Resolve Modal */}
            {showResolveModal && (
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
            )}
        </div>
    );
};
