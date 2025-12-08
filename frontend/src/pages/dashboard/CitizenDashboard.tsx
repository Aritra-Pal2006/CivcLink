import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getUserComplaints, type Complaint } from '../../services/complaintService';
import { Link } from 'react-router-dom';
import { Plus, Filter, MapPin, Calendar, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

export const CitizenDashboard: React.FC = () => {
    const { currentUser } = useAuth();
    const [complaints, setComplaints] = useState<Complaint[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');

    useEffect(() => {
        if (currentUser) {
            loadComplaints();
        }
    }, [currentUser]);

    const loadComplaints = async () => {
        try {
            const data = await getUserComplaints(currentUser!.uid);
            setComplaints(data);
        } catch (error) {
            console.error("Failed to load complaints", error);
        } finally {
            setLoading(false);
        }
    };

    const filteredComplaints = complaints.filter(c => {
        if (filter === 'all') return true;
        return c.status === filter;
    });

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'submitted': return 'bg-yellow-100 text-yellow-800';
            case 'in_review': return 'bg-blue-100 text-blue-800';
            case 'in_progress': return 'bg-indigo-100 text-indigo-800';
            case 'resolved': return 'bg-green-100 text-green-800';
            case 'rejected': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-white drop-shadow-md">My Complaints</h1>
                    <p className="mt-1 text-sm text-primary-100">Track and manage your reported issues</p>
                </div>
                <Link
                    to="/complaints/new"
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-lg text-sm font-medium text-primary-900 bg-white hover:bg-primary-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
                >
                    <Plus className="-ml-1 mr-2 h-5 w-5" />
                    New Complaint
                </Link>
            </div>

            {/* WhatsApp Banner */}
            <div className="bg-green-600/20 border border-green-500/30 rounded-lg p-4 mb-8 backdrop-blur-md flex items-start sm:items-center justify-between shadow-lg">
                <div className="flex items-center">
                    <div className="flex-shrink-0 bg-green-500 rounded-full p-2">
                        <svg className="h-6 w-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.008-.57-.008-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                        </svg>
                    </div>
                    <div className="ml-4">
                        <h3 className="text-lg font-medium text-white">New! File Complaints via WhatsApp</h3>
                        <p className="text-sm text-green-100">
                            Save our number <span className="font-bold select-all">+1 415 523 8886</span> and send a message with your location to file a complaint instantly.
                        </p>
                    </div>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-3 mb-8">
                <div className="bg-white/10 backdrop-blur-md overflow-hidden shadow-lg rounded-lg border border-white/20 hover:bg-white/20 transition-colors">
                    <div className="px-4 py-5 sm:p-6">
                        <dt className="text-sm font-medium text-primary-200 truncate">Total Reported</dt>
                        <dd className="mt-1 text-3xl font-semibold text-white">{complaints.length}</dd>
                    </div>
                </div>
                <div className="bg-white/10 backdrop-blur-md overflow-hidden shadow-lg rounded-lg border border-white/20 hover:bg-white/20 transition-colors">
                    <div className="px-4 py-5 sm:p-6">
                        <dt className="text-sm font-medium text-primary-200 truncate">In Progress</dt>
                        <dd className="mt-1 text-3xl font-semibold text-indigo-300">
                            {complaints.filter(c => ['in_review', 'in_progress'].includes(c.status)).length}
                        </dd>
                    </div>
                </div>
                <div className="bg-white/10 backdrop-blur-md overflow-hidden shadow-lg rounded-lg border border-white/20 hover:bg-white/20 transition-colors">
                    <div className="px-4 py-5 sm:p-6">
                        <dt className="text-sm font-medium text-primary-200 truncate">Resolved</dt>
                        <dd className="mt-1 text-3xl font-semibold text-green-300">
                            {complaints.filter(c => c.status === 'resolved').length}
                        </dd>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white/10 backdrop-blur-md shadow-lg rounded-lg mb-6 border border-white/20">
                <div className="p-4 border-b border-white/10 flex items-center space-x-4">
                    <Filter className="h-5 w-5 text-primary-200" />
                    <span className="text-sm font-medium text-white">Filter by Status:</span>
                    <select
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base bg-black/20 border-white/20 text-white focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md max-w-xs placeholder-white/50"
                    >
                        <option value="all" className="text-gray-900">All Statuses</option>
                        <option value="submitted" className="text-gray-900">Submitted</option>
                        <option value="in_progress" className="text-gray-900">In Progress</option>
                        <option value="resolved" className="text-gray-900">Resolved</option>
                    </select>
                </div>
            </div>

            {/* Complaints List */}
            <div className="bg-white/10 backdrop-blur-md shadow-lg overflow-hidden sm:rounded-md border border-white/20">
                {loading ? (
                    <div className="p-8 text-center text-primary-200">Loading complaints...</div>
                ) : filteredComplaints.length === 0 ? (
                    <div className="p-12 text-center">
                        <AlertCircle className="mx-auto h-12 w-12 text-primary-300" />
                        <h3 className="mt-2 text-sm font-medium text-white">No complaints found</h3>
                        <p className="mt-1 text-sm text-primary-200">Get started by filing a new complaint.</p>
                        <div className="mt-6">
                            <Link
                                to="/complaints/new"
                                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-primary-900 bg-white hover:bg-primary-50"
                            >
                                <Plus className="-ml-1 mr-2 h-5 w-5" />
                                File Complaint
                            </Link>
                        </div>
                    </div>
                ) : (
                    <ul className="divide-y divide-white/10">
                        {filteredComplaints.map((complaint) => (
                            <li key={complaint.id}>
                                <Link to={`/complaints/${complaint.id}`} className="block hover:bg-white/10 transition-colors">
                                    <div className="px-4 py-4 sm:px-6">
                                        <div className="flex items-center justify-between">
                                            <p className="text-sm font-medium text-white truncate">{complaint.title}</p>
                                            <div className="ml-2 flex-shrink-0 flex">
                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(complaint.status)}`}>
                                                    {complaint.status.replace('_', ' ').toUpperCase()}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="mt-2 sm:flex sm:justify-between">
                                            <div className="sm:flex">
                                                <p className="flex items-center text-sm text-primary-200">
                                                    <MapPin className="flex-shrink-0 mr-1.5 h-4 w-4 text-primary-300" />
                                                    {complaint.location?.address || 'Location not available'}
                                                </p>
                                            </div>
                                            <div className="mt-2 flex items-center text-sm text-primary-200 sm:mt-0">
                                                <Calendar className="flex-shrink-0 mr-1.5 h-4 w-4 text-primary-300" />
                                                <p>
                                                    Reported on <time dateTime={complaint.createdAt?.toDate().toISOString()}>
                                                        {complaint.createdAt ? format(complaint.createdAt.toDate(), 'MMM d, yyyy') : 'N/A'}
                                                    </time>
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
};
