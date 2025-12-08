import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getUserComplaints, type Complaint } from '../../services/complaintService';
import { useAuth } from '../../contexts/AuthContext';
import { format } from 'date-fns';
import { Plus, Filter } from 'lucide-react';
import clsx from 'clsx';

export const ComplaintListPage: React.FC = () => {
    const { currentUser } = useAuth();
    const [complaints, setComplaints] = useState<Complaint[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');

    useEffect(() => {
        const fetchComplaints = async () => {
            if (currentUser) {
                try {
                    const data = await getUserComplaints(currentUser.uid);
                    setComplaints(data);
                } catch (error) {
                    console.error("Failed to load complaints", error);
                } finally {
                    setLoading(false);
                }
            }
        };
        fetchComplaints();
    }, [currentUser]);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'submitted': return 'bg-gray-100 text-gray-800';
            case 'in_review': return 'bg-blue-100 text-blue-800';
            case 'in_progress': return 'bg-yellow-100 text-yellow-800';
            case 'resolved': return 'bg-green-100 text-green-800';
            case 'rejected': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const filteredComplaints = complaints.filter(c => {
        if (filter === 'all') return true;
        return c.status === filter;
    });

    if (loading) {
        return <div className="p-8 text-center text-gray-500">Loading complaints...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-white drop-shadow-md">My Complaints</h1>
                <Link
                    to="/complaints/new"
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-lg text-primary-900 bg-white hover:bg-primary-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
                >
                    <Plus className="mr-2 h-4 w-4" /> New Complaint
                </Link>
            </div>

            {/* Filters */}
            <div className="flex items-center space-x-2 overflow-x-auto pb-2">
                <Filter className="h-5 w-5 text-primary-200 mr-2" />
                {['all', 'submitted', 'in_progress', 'resolved'].map((status) => (
                    <button
                        key={status}
                        onClick={() => setFilter(status)}
                        className={clsx(
                            "px-3 py-1 rounded-full text-sm font-medium capitalize whitespace-nowrap transition-colors",
                            filter === status
                                ? "bg-primary-500 text-white shadow-md"
                                : "bg-white/10 text-primary-100 border border-white/20 hover:bg-white/20 hover:text-white"
                        )}
                    >
                        {status.replace('_', ' ')}
                    </button>
                ))}
            </div>

            {/* List */}
            <div className="bg-white/10 backdrop-blur-md shadow-xl overflow-hidden sm:rounded-md border border-white/20">
                <ul className="divide-y divide-white/10">
                    {filteredComplaints.length === 0 ? (
                        <li className="px-6 py-12 text-center text-primary-200">
                            No complaints found. Start by filing a new one!
                        </li>
                    ) : (
                        filteredComplaints.map((complaint) => (
                            <li key={complaint.id}>
                                <Link to={`/complaints/${complaint.id}`} className="block hover:bg-white/10 transition-colors">
                                    <div className="px-4 py-4 sm:px-6">
                                        <div className="flex items-center justify-between">
                                            <p className="text-sm font-medium text-white truncate">{complaint.title}</p>
                                            <div className="ml-2 flex-shrink-0 flex">
                                                <p className={clsx("px-2 inline-flex text-xs leading-5 font-semibold rounded-full capitalize", getStatusColor(complaint.status))}>
                                                    {complaint.status.replace('_', ' ')}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="mt-2 sm:flex sm:justify-between">
                                            <div className="sm:flex">
                                                <p className="flex items-center text-sm text-primary-200">
                                                    {complaint.category}
                                                </p>
                                                <p className="mt-2 flex items-center text-sm text-primary-200 sm:mt-0 sm:ml-6">
                                                    {complaint.location.address.substring(0, 30)}...
                                                </p>
                                            </div>
                                            <div className="mt-2 flex items-center text-sm text-primary-200 sm:mt-0">
                                                <p>
                                                    Filed on {complaint.createdAt ? format(complaint.createdAt.toDate(), 'MMM d, yyyy') : 'Just now'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            </li>
                        ))
                    )}
                </ul>
            </div>
        </div>
    );
};
