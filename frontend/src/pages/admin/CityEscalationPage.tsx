import React, { useEffect, useState } from 'react';
import { type Complaint, getEscalatedComplaints, updateComplaint } from '../../services/complaintService';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight, RefreshCw } from 'lucide-react';

export const CityEscalationPage: React.FC = () => {
    const [complaints, setComplaints] = useState<Complaint[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchEscalated = async () => {
        setLoading(true);
        try {
            const data = await getEscalatedComplaints();
            setComplaints(data);
        } catch (error) {
            console.error("Error fetching escalated complaints:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEscalated();
    }, []);

    const handleForceReopen = async (id: string) => {
        if (!confirm("Are you sure you want to FORCE REOPEN this complaint?")) return;
        try {
            await updateComplaint(id, { status: 'reopened', isEscalated: true } as any);
            alert("Complaint Reopened and flagged.");
            fetchEscalated();
        } catch (error) {
            console.error("Error reopening:", error);
        }
    };

    if (loading) return <div className="p-8 text-center text-white">Loading Escalations...</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center">
                        <AlertTriangle className="h-6 w-6 text-red-500 mr-2" />
                        City Escalation Panel
                    </h1>
                    <p className="text-primary-200 text-sm mt-1">
                        Review overdue complaints escalated from Ward Admins.
                    </p>
                </div>
                <button onClick={fetchEscalated} className="p-2 bg-white/10 rounded-full hover:bg-white/20 text-white">
                    <RefreshCw className="h-5 w-5" />
                </button>
            </div>

            {complaints.length === 0 ? (
                <div className="bg-white/10 backdrop-blur-md rounded-lg p-8 text-center border border-white/20">
                    <p className="text-primary-200 text-lg">No active escalations. Good job!</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {complaints.map(complaint => (
                        <div key={complaint.id} className="bg-red-900/20 backdrop-blur-md border border-red-500/30 rounded-lg p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center">
                            <div className="mb-4 sm:mb-0">
                                <div className="flex items-center space-x-2">
                                    <span className="px-2 py-0.5 rounded text-xs font-bold bg-red-600 text-white">OVERDUE</span>
                                    <span className="text-xs text-red-300">Escalated: {complaint.createdAt ? format(complaint.createdAt.toDate(), 'MMM d') : 'N/A'}</span>
                                </div>
                                <Link to={`/complaints/${complaint.id}`} className="text-lg font-semibold text-white hover:text-red-300 mt-1 block">
                                    {complaint.title}
                                </Link>
                                <p className="text-sm text-primary-200">
                                    Ward: {complaint.location.wardCode || 'Unknown'} • {complaint.category}
                                </p>
                            </div>
                            <div className="flex space-x-3">
                                <button
                                    onClick={() => handleForceReopen(complaint.id!)}
                                    className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-sm font-medium rounded-md border border-white/20 transition-colors"
                                >
                                    Force Reopen
                                </button>
                                <Link
                                    to={`/complaints/${complaint.id}`}
                                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-md flex items-center transition-colors"
                                >
                                    Inspect <ArrowRight className="ml-1 h-4 w-4" />
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
