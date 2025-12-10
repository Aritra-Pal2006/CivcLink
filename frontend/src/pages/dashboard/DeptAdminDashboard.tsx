import React, { useEffect, useState } from 'react';
import { getAdminComplaints, type Complaint } from '../../services/complaintService';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export const DeptAdminDashboard: React.FC = () => {
    const { userProfile, currentUser } = useAuth();
    const [complaints, setComplaints] = useState<Complaint[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('all');

    useEffect(() => {
        loadComplaints();
    }, [filterStatus, currentUser]);

    const loadComplaints = async () => {
        if (!currentUser) return;
        try {
            setLoading(true);
            const token = await currentUser.getIdToken();
            // Backend enforces Department filter
            const data = await getAdminComplaints({
                status: filterStatus,
                limit: 50
            }, token);
            setComplaints(data.complaints);
        } catch (error) {
            console.error("Failed to load complaints", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-white drop-shadow-md">Department Dashboard: {userProfile?.department || 'Unassigned'}</h1>
                    <p className="text-primary-100">Monitor department performance and SLAs</p>
                </div>
            </div>

            {/* Dept KPIs */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-3 mb-8">
                <div className="bg-white/10 backdrop-blur-md overflow-hidden shadow-lg rounded-lg p-5 border border-white/20">
                    <dt className="text-sm font-medium text-primary-200 truncate">Total Active</dt>
                    <dd className="mt-1 text-3xl font-semibold text-white">
                        {complaints.filter(c => !['resolved', 'rejected'].includes(c.status)).length}
                    </dd>
                </div>
                <div className="bg-white/10 backdrop-blur-md overflow-hidden shadow-lg rounded-lg p-5 border border-white/20">
                    <dt className="text-sm font-medium text-primary-200 truncate">SLA Breaches</dt>
                    <dd className="mt-1 text-3xl font-semibold text-red-300">0</dd> {/* Mock */}
                </div>
                <div className="bg-white/10 backdrop-blur-md overflow-hidden shadow-lg rounded-lg p-5 border border-white/20">
                    <dt className="text-sm font-medium text-primary-200 truncate">Avg Resolution Time</dt>
                    <dd className="mt-1 text-3xl font-semibold text-green-300">24h</dd> {/* Mock */}
                </div>
            </div>

            {/* Complaint Queue */}
            <div className="bg-white/10 backdrop-blur-md shadow-lg overflow-hidden sm:rounded-lg border border-white/20">
                <div className="px-4 py-5 sm:px-6 border-b border-white/10 flex justify-between items-center">
                    <h3 className="text-lg leading-6 font-medium text-white">Department Queue</h3>
                    <div className="flex space-x-2">
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="text-sm bg-white/10 border-white/20 text-white rounded-md"
                        >
                            <option value="all" className="text-gray-900">All Statuses</option>
                            <option value="submitted" className="text-gray-900">Submitted</option>
                            <option value="in_progress" className="text-gray-900">In Progress</option>
                        </select>
                    </div>
                </div>
                <table className="min-w-full divide-y divide-white/10">
                    <thead className="bg-white/10">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-primary-100 uppercase tracking-wider">ID</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-primary-100 uppercase tracking-wider">Ward</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-primary-100 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-primary-100 uppercase tracking-wider">Assigned To</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-primary-100 uppercase tracking-wider">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                        {loading && complaints.length === 0 ? (
                            <tr><td colSpan={5} className="px-6 py-4 text-center text-primary-200">Loading...</td></tr>
                        ) : complaints.map((complaint) => (
                            <tr key={complaint.id} className="hover:bg-white/10 transition-colors">
                                <td className="px-6 py-4 text-sm text-white">#{complaint.id?.slice(0, 8)}</td>
                                <td className="px-6 py-4 text-sm text-white">{(complaint.location as any)?.wardCode || 'N/A'}</td>
                                <td className="px-6 py-4 text-sm text-white">{complaint.status}</td>
                                <td className="px-6 py-4 text-sm text-primary-200">Ward Admin {(complaint.location as any)?.wardCode}</td>
                                <td className="px-6 py-4 text-sm font-medium">
                                    <Link to={`/complaints/${complaint.id}`} className="text-primary-300 hover:text-white mr-3">View</Link>
                                    <button className="text-indigo-300 hover:text-indigo-100">Reassign</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
