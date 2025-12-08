import React, { useEffect, useState } from 'react';
import { voteResolution, type Complaint } from '../../services/complaintService'; // Reusing getAdminComplaints for filtering
import { useAuth } from '../../contexts/AuthContext';
import { CheckCircle, ThumbsUp, ThumbsDown, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';

export const CommunityVerificationPage: React.FC = () => {
    const { userProfile } = useAuth();
    const [complaints, setComplaints] = useState<Complaint[]>([]);
    const [loading, setLoading] = useState(true);
    const [voting, setVoting] = useState<string | null>(null);

    const fetchComplaints = async () => {
        setLoading(true);
        try {
            // We need a way to pass 'needsCommunityVote=true' to the service.
            // I'll cast the filter object to any to bypass strict typing if needed, 
            // or better, assume getAdminComplaints passes query params correctly.
            // The service function constructs query params from the object.
            // We need to ensure the service supports 'needsCommunityVote' key if strictly typed.
            // For now, I'll cast or assume it works as I updated the backend.
            // Wait, I didn't update the frontend service `getAdminComplaints` to accept `needsCommunityVote`.
            // I should update that too, but for now let's try passing it as 'status' or just rely on a new fetch.
            // Actually, I'll just use a direct fetch here or update the service.
            // Let's assume I'll update the service or use a direct fetch for now.

            const response = await fetch('http://localhost:5000/api/complaints?needsCommunityVote=true');
            if (!response.ok) throw new Error('Failed to fetch');
            const data = await response.json();
            // Map dates if needed, currently using raw data
            setComplaints(data);
        } catch (error) {
            console.error("Failed to fetch verification tasks", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchComplaints();
    }, []);

    const handleVote = async (id: string, vote: 'looks_fixed' | 'not_fixed') => {
        if (!userProfile) {
            alert("Please login to vote.");
            return;
        }
        setVoting(id);
        try {
            await voteResolution(id, userProfile.uid, vote);
            // Remove from list or show success
            setComplaints(prev => prev.filter(c => c.id !== id));
            alert("Vote recorded! Thank you for helping the community.");
        } catch (error) {
            alert("Failed to record vote");
        } finally {
            setVoting(null);
        }
    };

    if (loading) return (
        <div className="flex justify-center items-center min-h-screen">
            <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
        </div>
    );

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-white">Community Verification Center</h1>
                <p className="mt-2 text-primary-200">
                    Help verify resolved complaints. Your vote ensures transparency and prevents fake resolutions.
                </p>
            </div>

            {complaints.length === 0 ? (
                <div className="text-center py-12 bg-white/5 rounded-lg border border-white/10">
                    <CheckCircle className="mx-auto h-12 w-12 text-green-400" />
                    <h3 className="mt-2 text-sm font-medium text-white">All Caught Up!</h3>
                    <p className="mt-1 text-sm text-primary-300">No complaints currently need community verification.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {complaints.map((complaint) => (
                        <div key={complaint.id} className="bg-white/10 backdrop-blur-md rounded-lg shadow-xl overflow-hidden border border-white/20 flex flex-col">
                            {/* Header */}
                            <div className="p-4 border-b border-white/10">
                                <h3 className="text-lg font-medium text-white truncate">{complaint.title}</h3>
                                <p className="text-xs text-primary-300 mt-1">{complaint.location.address}</p>
                            </div>

                            {/* Comparison Images */}
                            <div className="p-4 flex-1 space-y-4">
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <p className="text-xs text-primary-200 mb-1">Original</p>
                                        {complaint.attachments?.[0] ? (
                                            <img
                                                src={complaint.attachments[0].thumbnailLink || complaint.attachments[0].webViewLink}
                                                alt="Original"
                                                className="w-full h-32 object-cover rounded bg-black/20"
                                            />
                                        ) : (
                                            <div className="w-full h-32 bg-white/5 rounded flex items-center justify-center text-xs text-white/30">No Image</div>
                                        )}
                                    </div>
                                    <div>
                                        <p className="text-xs text-green-200 mb-1">Resolution</p>
                                        {complaint.resolutionProof ? (
                                            <img
                                                src={complaint.resolutionProof.thumbnailLink || complaint.resolutionProof.webViewLink}
                                                alt="Resolution"
                                                className="w-full h-32 object-cover rounded bg-black/20 border border-green-500/30"
                                            />
                                        ) : (
                                            <div className="w-full h-32 bg-white/5 rounded flex items-center justify-center text-xs text-white/30">No Proof</div>
                                        )}
                                    </div>
                                </div>

                                {/* AI Verdict */}
                                {complaint.verification && (
                                    <div className="bg-white/5 p-2 rounded border border-white/10">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-xs text-primary-200">AI Analysis</span>
                                            <span className={`text-xs px-2 py-0.5 rounded-full border ${complaint.verification.aiVerdict === 'LIKELY_MATCH' ? 'bg-green-500/20 text-green-200 border-green-500/30' :
                                                complaint.verification.aiVerdict === 'LIKELY_FAKE' ? 'bg-red-500/20 text-red-200 border-red-500/30' :
                                                    'bg-yellow-500/20 text-yellow-200 border-yellow-500/30'
                                                }`}>
                                                {complaint.verification.aiVerdict.replace('_', ' ')}
                                            </span>
                                        </div>
                                        <p className="text-xs text-primary-300 italic">
                                            "{complaint.verification.aiReason}"
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Actions */}
                            <div className="p-4 bg-white/5 border-t border-white/10">
                                <p className="text-center text-sm text-white mb-3 font-medium">Does this look fixed?</p>
                                <div className="flex space-x-3">
                                    <button
                                        onClick={() => handleVote(complaint.id!, 'looks_fixed')}
                                        disabled={voting === complaint.id}
                                        className="flex-1 flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                                    >
                                        <ThumbsUp className="h-4 w-4 mr-2" />
                                        Yes
                                    </button>
                                    <button
                                        onClick={() => handleVote(complaint.id!, 'not_fixed')}
                                        disabled={voting === complaint.id}
                                        className="flex-1 flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                                    >
                                        <ThumbsDown className="h-4 w-4 mr-2" />
                                        No / Fake
                                    </button>
                                </div>
                                <div className="mt-3 text-center">
                                    <Link to={`/complaints/${complaint.id}`} className="text-xs text-primary-300 hover:text-white">
                                        View Full Details
                                    </Link>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
