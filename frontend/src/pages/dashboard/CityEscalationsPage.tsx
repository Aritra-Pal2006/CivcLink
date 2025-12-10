import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getAdminComplaints, type Complaint, updateComplaint } from '../../services/complaintService';
import { AlertTriangle, Lock, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export const CityEscalationsPage: React.FC = () => {
    const { currentUser } = useAuth();
    const [complaints, setComplaints] = useState<Complaint[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchEscalations();
    }, [currentUser]);

    const fetchEscalations = async () => {
        if (!currentUser) return;
        try {
            setLoading(true);
            const token = await currentUser.getIdToken();
            // Fetch escalated OR flagged complaints
            // Since our API filters are additive, we might need two calls or a specialized endpoint.
            // For now, let's fetch 'flagged' status and 'isEscalated' separately and merge, or just fetch all relevant ones.
            // Let's fetch all and filter client side for MVP or use the new filters.

            // Fetch 1: Flagged Status
            const flaggedPromise = getAdminComplaints({ status: 'flagged', limit: 50 }, token);
            // Fetch 2: Escalated
            const escalatedPromise = getAdminComplaints({ isEscalated: true, limit: 50 }, token);

            const [flaggedData, escalatedData] = await Promise.all([flaggedPromise, escalatedPromise]);

            // Merge and Deduplicate
            const allComplaints = [...flaggedData.complaints, ...escalatedData.complaints];
            const uniqueComplaints = Array.from(new Map(allComplaints.map(item => [item.id, item])).values());

            setComplaints(uniqueComplaints);
        } catch (error) {
            console.error("Error fetching escalations:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleLock = async (id: string) => {
        if (!currentUser) return;
        if (!window.confirm("Are you sure you want to lock this complaint for inquiry?")) return;
        try {
            const token = await currentUser.getIdToken();
            await updateComplaint(id, { status: 'flagged' }, token); // Ensure it stays flagged or moves to a 'locked' state if we had one
            alert("Complaint locked for inquiry.");
            fetchEscalations();
        } catch (error) {
            console.error("Error locking complaint:", error);
        }
    };

    if (loading) return <div className="p-8 text-center">Loading escalations...</div>;

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                <AlertTriangle className="h-6 w-6 text-red-600 mr-2" />
                Escalations & Fraud Control
            </h1>

            <div className="bg-white shadow overflow-hidden sm:rounded-md">
                <ul className="divide-y divide-gray-200">
                    {complaints.length === 0 ? (
                        <li className="p-6 text-center text-gray-500">No escalated or flagged cases found.</li>
                    ) : (
                        complaints.map((complaint) => (
                            <li key={complaint.id}>
                                <div className="px-4 py-4 sm:px-6 hover:bg-gray-50">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center">
                                            <p className="text-sm font-medium text-indigo-600 truncate">{complaint.title}</p>
                                            <span className="ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                                                {complaint.status}
                                            </span>
                                        </div>
                                        <div className="ml-2 flex-shrink-0 flex">
                                            <p className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                                                {complaint.category}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="mt-2 sm:flex sm:justify-between">
                                        <div className="sm:flex">
                                            <p className="flex items-center text-sm text-gray-500">
                                                Ward: {(complaint.location as any)?.wardCode || 'N/A'}
                                            </p>
                                        </div>
                                        <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                                            <button
                                                onClick={() => handleLock(complaint.id!)}
                                                className="text-red-600 hover:text-red-900 mr-4 flex items-center"
                                            >
                                                <Lock className="h-4 w-4 mr-1" /> Lock
                                            </button>
                                            <Link to={`/complaints/${complaint.id}`} className="text-indigo-600 hover:text-indigo-900 flex items-center">
                                                View Details <ArrowRight className="h-4 w-4 ml-1" />
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            </li>
                        ))
                    )}
                </ul>
            </div>
        </div>
    );
};
