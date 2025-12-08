import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, getDocs, limit } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { type Complaint, upvoteComplaint } from '../../services/complaintService';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { ThumbsUp, MessageSquare, MapPin } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import clsx from 'clsx';

export const PublicFeedPage: React.FC = () => {
    const [complaints, setComplaints] = useState<Complaint[]>([]);
    const [loading, setLoading] = useState(true);
    const { currentUser } = useAuth();

    const fetchComplaints = async () => {
        try {
            // In a real app, we'd paginate this
            const q = query(collection(db, 'complaints'), orderBy('createdAt', 'desc'), limit(50));
            const querySnapshot = await getDocs(q);
            setComplaints(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Complaint)));
        } catch (error) {
            console.error("Error fetching public feed:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchComplaints();
    }, []);

    const handleUpvote = async (e: React.MouseEvent, complaint: Complaint) => {
        e.preventDefault(); // Prevent navigation if clicking button inside Link
        if (!currentUser || !complaint.id) return;

        try {
            await upvoteComplaint(complaint.id, currentUser.uid);
            // Optimistic update
            const isUpvoted = complaint.upvotedBy?.includes(currentUser.uid);
            setComplaints(complaints.map(c => {
                if (c.id === complaint.id) {
                    return {
                        ...c,
                        upvotes: (c.upvotes || 0) + (isUpvoted ? -1 : 1),
                        upvotedBy: isUpvoted
                            ? c.upvotedBy?.filter(id => id !== currentUser.uid)
                            : [...(c.upvotedBy || []), currentUser.uid]
                    };
                }
                return c;
            }));
        } catch (error) {
            console.error("Failed to upvote", error);
        }
    };

    if (loading) return <div className="p-8 text-center">Loading feed...</div>;

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div className="md:flex md:items-center md:justify-between">
                <div className="flex-1 min-w-0">
                    <h2 className="text-2xl font-bold leading-7 text-white sm:text-3xl sm:truncate drop-shadow-md">
                        Community Feed
                    </h2>
                    <p className="mt-1 text-sm text-primary-100">See what's happening in your city.</p>
                </div>
            </div>

            <div className="space-y-4">
                {complaints.map((complaint) => (
                    <div key={complaint.id} className="bg-white/10 backdrop-blur-md border border-white/20 shadow-xl rounded-lg p-6 hover:bg-white/20 transition-all duration-200">
                        <div className="flex justify-between items-start">
                            <div className="flex-1">
                                <Link to={`/complaints/${complaint.id}`} className="block group">
                                    <h3 className="text-lg font-medium text-white group-hover:text-primary-300 transition-colors">
                                        {complaint.title}
                                    </h3>
                                    <p className="mt-1 text-sm text-primary-100 line-clamp-2">
                                        {complaint.description}
                                    </p>
                                </Link>

                                <div className="mt-4 flex items-center text-sm text-primary-200 space-x-4">
                                    <span className="flex items-center">
                                        <MapPin className="flex-shrink-0 mr-1.5 h-4 w-4 text-primary-300" />
                                        {complaint.location.address.split(',')[0]} {/* Show simplified address */}
                                    </span>
                                    <span>
                                        {complaint.createdAt ? format(complaint.createdAt.toDate(), 'MMM d') : 'N/A'}
                                    </span>
                                    <span className={clsx("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize",
                                        complaint.status === 'resolved' ? 'bg-green-500/20 text-green-100 border border-green-500/30' : 'bg-yellow-500/20 text-yellow-100 border border-yellow-500/30')}>
                                        {complaint.status.replace('_', ' ')}
                                    </span>
                                </div>
                            </div>

                            {complaint.attachments && complaint.attachments.length > 0 && (
                                <div className="ml-4 flex-shrink-0">
                                    <img
                                        src={complaint.attachments[0].thumbnailLink}
                                        alt="Attachment"
                                        className="h-20 w-20 object-cover rounded-md bg-white/10 border border-white/10"
                                    />
                                </div>
                            )}
                        </div>

                        <div className="mt-4 border-t border-white/10 pt-4 flex items-center justify-between">
                            <div className="flex space-x-6">
                                <button
                                    onClick={(e) => handleUpvote(e, complaint)}
                                    className={clsx("flex items-center text-sm font-medium transition-colors",
                                        complaint.upvotedBy?.includes(currentUser?.uid || '')
                                            ? "text-primary-300"
                                            : "text-primary-200 hover:text-white"
                                    )}
                                >
                                    <ThumbsUp className={clsx("mr-2 h-4 w-4", complaint.upvotedBy?.includes(currentUser?.uid || '') && "fill-current")} />
                                    {complaint.upvotes || 0} Supports
                                </button>
                                <Link to={`/complaints/${complaint.id}`} className="flex items-center text-sm font-medium text-primary-200 hover:text-white transition-colors">
                                    <MessageSquare className="mr-2 h-4 w-4" />
                                    View Details
                                </Link>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
