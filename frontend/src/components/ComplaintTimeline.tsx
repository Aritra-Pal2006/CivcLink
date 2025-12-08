import React, { useEffect, useState } from 'react';
import { getComplaintTimeline } from '../services/complaintService';
import { format } from 'date-fns';
import { CheckCircle, AlertCircle, Edit, MessageSquare, Send, RefreshCw } from 'lucide-react';

interface Activity {
    id: string;
    type: 'created' | 'ai_analyzed' | 'admin_updated' | 'admin_resolved' | 'citizen_verified' | 'citizen_reopened';
    actorId: string;
    actorRole: string;
    note?: string;
    meta?: any;
    timestamp: any;
}

interface ComplaintTimelineProps {
    complaintId: string;
}

const ComplaintTimeline: React.FC<ComplaintTimelineProps> = ({ complaintId }) => {
    const [activities, setActivities] = useState<Activity[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchTimeline = async () => {
            try {
                const data = await getComplaintTimeline(complaintId);
                setActivities(data);
            } catch (err) {
                setError("Failed to load timeline");
            } finally {
                setLoading(false);
            }
        };

        fetchTimeline();
    }, [complaintId]);

    if (loading) return <div className="text-sm text-gray-500">Loading timeline...</div>;
    if (error) return <div className="text-sm text-red-500">{error}</div>;
    if (activities.length === 0) return <div className="text-sm text-gray-500">No activity recorded.</div>;

    const getIcon = (type: string) => {
        switch (type) {
            case 'created': return <Send className="w-4 h-4 text-blue-500" />;
            case 'ai_analyzed': return <MessageSquare className="w-4 h-4 text-purple-500" />;
            case 'admin_updated': return <Edit className="w-4 h-4 text-orange-500" />;
            case 'admin_resolved': return <CheckCircle className="w-4 h-4 text-green-500" />;
            case 'citizen_verified': return <CheckCircle className="w-4 h-4 text-green-700" />;
            case 'citizen_reopened': return <RefreshCw className="w-4 h-4 text-red-500" />;
            default: return <AlertCircle className="w-4 h-4 text-gray-500" />;
        }
    };

    const getTitle = (activity: Activity) => {
        switch (activity.type) {
            case 'created': return 'Complaint Submitted';
            case 'ai_analyzed': return 'AI Analysis Complete';
            case 'admin_updated': return 'Updated by Official';
            case 'admin_resolved': return 'Marked as Resolved';
            case 'citizen_verified': return 'Verified by Citizen';
            case 'citizen_reopened': return 'Reopened by Citizen';
            default: return 'Activity';
        }
    };

    return (
        <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800">Activity Log</h3>
            <div className="relative border-l-2 border-gray-200 ml-3 space-y-6">
                {activities.map((activity) => (
                    <div key={activity.id} className="mb-8 ml-6 relative">
                        <span className="absolute -left-[35px] bg-white p-1 rounded-full border border-gray-200">
                            {getIcon(activity.type)}
                        </span>
                        <div className="flex flex-col">
                            <span className="text-sm font-medium text-gray-900">{getTitle(activity)}</span>
                            <span className="text-xs text-gray-500">
                                {activity.timestamp?.toDate ? format(activity.timestamp.toDate(), 'PP p') : 'Unknown time'}
                            </span>

                            {activity.note && (
                                <p className="mt-1 text-sm text-gray-600 bg-gray-50 p-2 rounded">
                                    "{activity.note}"
                                </p>
                            )}

                            {activity.type === 'ai_analyzed' && activity.meta && (
                                <div className="mt-2 text-xs text-gray-600 bg-purple-50 p-2 rounded border border-purple-100">
                                    <p><strong>Category:</strong> {activity.meta.category}</p>
                                    <p><strong>Priority:</strong> {activity.meta.priority}</p>
                                    <p><strong>Summary:</strong> {activity.meta.summary}</p>
                                </div>
                            )}

                            {activity.type === 'admin_updated' && activity.meta?.updates && (
                                <div className="mt-1 text-xs text-gray-500">
                                    Updated: {activity.meta.updates.join(', ')}
                                </div>
                            )}
                            {activity.type === 'citizen_reopened' && activity.meta?.reason && (
                                <div className="mt-1 text-xs text-red-600">
                                    Reason: {activity.meta.reason}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ComplaintTimeline;
