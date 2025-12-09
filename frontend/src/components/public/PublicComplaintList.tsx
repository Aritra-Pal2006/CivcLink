import React from 'react';
import { format } from 'date-fns';
import { MapPin, Clock } from 'lucide-react';
import type { Complaint } from '../../services/complaintService';

interface PublicComplaintListProps {
    complaints: Complaint[];
}

export const PublicComplaintList: React.FC<PublicComplaintListProps> = ({ complaints }) => {
    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100">
                <h3 className="text-sm font-medium text-gray-700">Recent Reports</h3>
            </div>
            <ul className="divide-y divide-gray-100 max-h-[400px] overflow-y-auto">
                {complaints.map((complaint) => (
                    <li key={complaint.id} className="p-4 hover:bg-gray-50 transition-colors">
                        <div className="flex justify-between items-start">
                            <div>
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize mb-1
                                    ${complaint.status === 'resolved' ? 'bg-green-100 text-green-800' :
                                        complaint.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                                            'bg-yellow-100 text-yellow-800'}`}>
                                    {complaint.status.replace('_', ' ')}
                                </span>
                                <h4 className="text-sm font-medium text-gray-900 line-clamp-1">{complaint.title}</h4>
                                <div className="mt-1 flex items-center text-xs text-gray-500">
                                    <MapPin className="h-3 w-3 mr-1" />
                                    <span className="truncate max-w-[150px]">{complaint.location?.address || 'Unknown Location'}</span>
                                </div>
                            </div>
                            <div className="text-xs text-gray-400 flex items-center">
                                <Clock className="h-3 w-3 mr-1" />
                                {complaint.createdAt ? format(complaint.createdAt.toDate(), 'MMM d') : ''}
                            </div>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
};
