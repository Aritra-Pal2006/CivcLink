import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
    updateComplaint,
    addComplaintNote,
    getComplaintNotes,
    voteDispute,
    uploadCitizenProof,
    voteResolution,
    reopenComplaint,
    type Complaint,
    type ComplaintNote
} from '../../services/complaintService';
import { Timestamp } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import { Icon } from 'leaflet';
import markerIconPng from "leaflet/dist/images/marker-icon.png";
import markerShadowPng from "leaflet/dist/images/marker-shadow.png";
import { format } from 'date-fns';
import { ArrowLeft, Send, User, CheckCircle, Loader2, AlertTriangle, ThumbsUp, ThumbsDown, Camera } from 'lucide-react';
import clsx from 'clsx';
import ComplaintTimeline from '../../components/ComplaintTimeline';

const defaultIcon = new Icon({
    iconUrl: markerIconPng,
    shadowUrl: markerShadowPng,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
});

export const ComplaintDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const { userProfile } = useAuth();
    const [complaint, setComplaint] = useState<Complaint | null>(null);
    const [notes, setNotes] = useState<ComplaintNote[]>([]);
    const [newNote, setNewNote] = useState('');
    const [loading, setLoading] = useState(true);
    const [sendingNote, setSendingNote] = useState(false);
    const [citizenProofFile, setCitizenProofFile] = useState<File | null>(null);
    const [uploadingProof, setUploadingProof] = useState(false);

    const isOfficial = userProfile?.role === 'official' || userProfile?.role === 'superadmin';

    useEffect(() => {
        let unsubscribe: () => void;

        const fetchData = async () => {
            if (id) {
                try {
                    // Initial fetch for notes (still one-time for now, or could be real-time too)
                    const notesData = await getComplaintNotes(id);
                    setNotes(notesData);

                    // Real-time subscription for complaint details
                    const { subscribeToComplaint } = await import('../../services/complaintService');
                    unsubscribe = subscribeToComplaint(id, (updatedComplaint) => {
                        setComplaint(updatedComplaint);
                        setLoading(false);
                    });
                } catch (error) {
                    console.error("Failed to load data", error);
                    setLoading(false);
                }
            }
        };
        fetchData();

        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, [id]);

    const [showResolveModal, setShowResolveModal] = useState(false);
    const [resolveProofFile, setResolveProofFile] = useState<File | null>(null);
    const [resolveNote, setResolveNote] = useState('');
    const [resolving, setResolving] = useState(false);

    const handleStatusChange = async (newStatus: string) => {
        if (!complaint || !id) return;

        if (newStatus === 'resolved') {
            setShowResolveModal(true);
            return;
        }

        try {
            await updateComplaint(id, { status: newStatus as any });
            setComplaint({ ...complaint, status: newStatus as any });
        } catch (error) {
            alert("Failed to update status");
        }
    };

    const handleResolveSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!complaint || !id || !resolveProofFile) return;

        setResolving(true);
        try {
            const { uploadComplaintAttachment } = await import('../../services/complaintService');
            const result = await uploadComplaintAttachment(resolveProofFile);

            const proofData = {
                ...result,
                name: resolveProofFile.name,
                description: resolveNote,
                uploadedAt: Timestamp.now()
            };

            // Calculate deadline: Now + 48 hours
            const deadline = new Date();
            deadline.setHours(deadline.getHours() + 48);

            await updateComplaint(id, {
                status: 'pending_verification',
                resolutionProof: proofData,
                verificationDeadline: Timestamp.fromDate(deadline)
            });

            setComplaint({
                ...complaint,
                status: 'pending_verification',
                resolutionProof: proofData,
                verificationDeadline: Timestamp.fromDate(deadline)
            });
            setShowResolveModal(false);
        } catch (error) {
            console.error("Failed to resolve", error);
            alert("Failed to submit resolution proof");
        } finally {
            setResolving(false);
        }
    };

    const handleCitizenAction = async (action: 'verify' | 'reopen') => {
        if (!complaint || !id) return;

        try {
            if (action === 'verify') {
                await updateComplaint(id, { status: 'resolved' });
                setComplaint({ ...complaint, status: 'resolved' });
            } else {
                if (!userProfile) {
                    alert("You must be logged in to reopen a complaint.");
                    return;
                }
                const reason = prompt("Please provide a reason for reopening this complaint:");
                if (!reason) return; // Cancelled

                await reopenComplaint(id, userProfile.uid, reason); // Use the service function
                // await updateComplaint(id, {
                //     status: 'reopened',
                //     timesReopened: (complaint.timesReopened || 0) + 1
                // });
                setComplaint({
                    ...complaint,
                    status: 'reopened',
                    timesReopened: (complaint.timesReopened || 0) + 1
                });
            }
        } catch (error) {
            alert("Failed to update status");
        }
    };

    const handleAssignmentChange = async (assignee: string) => {
        if (!complaint || !id) return;
        try {
            await updateComplaint(id, { assignedTo: assignee });
            setComplaint({ ...complaint, assignedTo: assignee });
        } catch (error) {
            alert("Failed to assign");
        }
    };

    const handleAddNote = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newNote.trim() || !id || !userProfile) return;

        setSendingNote(true);
        try {
            const noteData = {
                complaintId: id,
                userId: userProfile.uid,
                userName: userProfile.displayName || 'Unknown User',
                content: newNote,
                isPublic: true,
            };

            await addComplaintNote(id, noteData);

            // Refresh notes
            const updatedNotes = await getComplaintNotes(id);
            setNotes(updatedNotes);
            setNewNote('');
        } catch (error) {
            console.error("Failed to add note", error);
            alert("Failed to add note");
        } finally {
            setSendingNote(false);
        }
    };

    const handleVoteDispute = async () => {
        if (!id || !userProfile) return;
        try {
            await voteDispute(id, userProfile.uid);
            alert("Dispute vote recorded. Thank you for your vigilance.");
        } catch (error) {
            alert("Failed to record vote");
        }
    };

    const handleUploadCitizenProof = async () => {
        if (!id || !userProfile || !citizenProofFile) return;
        setUploadingProof(true);
        try {
            await uploadCitizenProof(id, userProfile.uid, citizenProofFile);
            setCitizenProofFile(null);
            alert("Proof uploaded successfully");
        } catch (error) {
            alert("Failed to upload proof");
        } finally {
            setUploadingProof(false);
        }
    };

    const handleVoteResolution = async (vote: 'looks_fixed' | 'not_fixed') => {
        if (!id || !userProfile) return;
        try {
            await voteResolution(id, userProfile.uid, vote);
            alert("Vote recorded");
        } catch (error) {
            alert("Failed to record vote");
        }
    };

    if (loading) return <div className="p-8 text-center">Loading...</div>;
    if (!complaint) return <div className="p-8 text-center text-red-500">Complaint not found</div>;

    const isOwner = userProfile?.uid === complaint.userId;

    return (
        <div className="max-w-4xl mx-auto space-y-6 relative">
            <Link to="/complaints" className="inline-flex items-center text-sm text-primary-200 hover:text-white transition-colors">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Complaints
            </Link>

            {/* Citizen Verification Banner */}
            {isOwner && complaint.status === 'pending_verification' && (
                <div className="bg-yellow-500/20 border-l-4 border-yellow-400 p-4 shadow-lg rounded-r-md backdrop-blur-sm">
                    <div className="flex justify-between items-center">
                        <div className="flex">
                            <div className="flex-shrink-0">
                                <CheckCircle className="h-5 w-5 text-yellow-400" aria-hidden="true" />
                            </div>
                            <div className="ml-3">
                                <p className="text-sm text-yellow-100">
                                    The official has marked this as resolved. Please verify.
                                    {complaint.verificationDeadline && (
                                        <span className="block text-xs mt-1 text-yellow-200">
                                            Auto-resolution in: {complaint.verificationDeadline?.toDate ? format(complaint.verificationDeadline.toDate(), 'PP p') : 'Soon'}
                                        </span>
                                    )}
                                </p>
                            </div>
                        </div>
                        <div className="flex space-x-3">
                            <button
                                onClick={() => handleCitizenAction('verify')}
                                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 shadow-sm"
                            >
                                Yes, Resolved
                            </button>
                            <button
                                onClick={() => handleCitizenAction('reopen')}
                                className="inline-flex items-center px-3 py-2 border border-white/30 text-sm leading-4 font-medium rounded-md text-white bg-white/10 hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                            >
                                No, Reopen
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Reopen Button for Resolved Complaints */}
            {isOwner && complaint.status === 'resolved' && (
                <div className="bg-white/10 backdrop-blur-md p-4 rounded-md border border-white/20 flex justify-between items-center shadow-lg">
                    <span className="text-sm text-primary-100">Issue persists? You can request to reopen this complaint.</span>
                    <button
                        onClick={() => handleCitizenAction('reopen')}
                        className="inline-flex items-center px-3 py-2 border border-white/30 text-sm leading-4 font-medium rounded-md text-white bg-white/10 hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                    >
                        Not Resolved? Request Reopen
                    </button>
                </div>
            )}

            {/* Reopened Badge */}
            {complaint.status === 'reopened' && (
                <div className="bg-red-500/20 border-l-4 border-red-400 p-4 backdrop-blur-sm rounded-r-md">
                    <div className="flex">
                        <div className="flex-shrink-0">
                            <Loader2 className="h-5 w-5 text-red-400" aria-hidden="true" />
                        </div>
                        <div className="ml-3">
                            <p className="text-sm text-red-100">
                                Dispute Submitted. This complaint has been reopened for further review.
                                {complaint.timesReopened && complaint.timesReopened > 1 && (
                                    <span className="font-bold ml-1">(Reopened {complaint.timesReopened} times)</span>
                                )}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Flagged Badge (Watchdog) */}
            {complaint.status === 'flagged' && (
                <div className="bg-red-500/20 border-l-4 border-red-500 p-4 backdrop-blur-sm rounded-r-md">
                    <div className="flex">
                        <div className="flex-shrink-0">
                            <AlertTriangle className="h-5 w-5 text-red-500" aria-hidden="true" />
                        </div>
                        <div className="ml-3">
                            <h3 className="text-sm font-medium text-red-200">Flagged for Review</h3>
                            <div className="mt-2 text-sm text-red-100">
                                <p>This complaint has been flagged by the community due to multiple disputes. A Superadmin will review it shortly.</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Fraud Alert (AI) */}
            {(complaint as any).possibleFraud && (
                <div className="bg-orange-500/20 border-l-4 border-orange-400 p-4 backdrop-blur-sm rounded-r-md">
                    <div className="flex">
                        <div className="flex-shrink-0">
                            <AlertTriangle className="h-5 w-5 text-orange-400" aria-hidden="true" />
                        </div>
                        <div className="ml-3">
                            <h3 className="text-sm font-medium text-orange-200">Potential Mismatch Detected</h3>
                            <div className="mt-2 text-sm text-orange-100">
                                <p>Our AI system detected a potential mismatch in the resolution proof. Please review carefully.</p>
                                {(complaint as any).fraudReason && (
                                    <p className="mt-1 text-xs italic">Reason: {(complaint as any).fraudReason}</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="bg-white/10 backdrop-blur-md shadow-xl overflow-hidden sm:rounded-lg border border-white/20">
                <div className="px-4 py-5 sm:px-6 flex justify-between items-start">
                    <div>
                        <h3 className="text-lg leading-6 font-medium text-white drop-shadow-md">{complaint.title}</h3>
                        <p className="mt-1 max-w-2xl text-sm text-primary-200">Filed on {complaint.createdAt?.toDate ? format(complaint.createdAt.toDate(), 'PPpp') : 'N/A'}</p>
                    </div>
                    <div className="flex space-x-2 items-center">
                        {complaint.targetResolutionDate && (
                            <span className={clsx("px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full",
                                new Date() > complaint.targetResolutionDate.toDate() && complaint.status !== 'resolved' ? 'bg-red-500/20 text-red-100 border border-red-500/30' : 'bg-blue-500/20 text-blue-100 border border-blue-500/30')}>
                                Due: {complaint.targetResolutionDate?.toDate ? format(complaint.targetResolutionDate.toDate(), 'MMM d') : 'N/A'}
                            </span>
                        )}
                        <span className={clsx("px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full capitalize",
                            complaint.status === 'resolved' ? 'bg-green-500/20 text-green-100 border border-green-500/30' :
                                complaint.status === 'reopened' ? 'bg-red-500/20 text-red-100 border border-red-500/30' :
                                    complaint.status === 'pending_verification' ? 'bg-yellow-500/20 text-yellow-100 border border-yellow-500/30' :
                                        complaint.status === 'flagged' ? 'bg-red-500/20 text-red-100 border border-red-500/30' :
                                            'bg-yellow-500/20 text-yellow-100 border border-yellow-500/30')}>
                            {complaint.status.replace('_', ' ')}
                        </span>
                        {isOfficial && (
                            <select
                                value={complaint.status}
                                onChange={(e) => handleStatusChange(e.target.value)}
                                className="ml-2 block pl-3 pr-10 py-1 text-base bg-white/10 border-white/20 text-white focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
                            >
                                <option value="submitted" className="text-gray-900">Submitted</option>
                                <option value="in_review" className="text-gray-900">In Review</option>
                                <option value="in_progress" className="text-gray-900">In Progress</option>
                                <option value="resolved" className="text-gray-900">Resolved (Start Verification)</option>
                                <option value="rejected" className="text-gray-900">Rejected</option>
                            </select>
                        )}
                    </div>
                </div>
                <div className="border-t border-white/10 px-4 py-5 sm:px-6">
                    <dl className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2">
                        {complaint.attachments && complaint.attachments.length > 0 && (
                            <div className="sm:col-span-2">
                                <dt className="text-sm font-medium text-primary-200">Attachments</dt>
                                <dd className="mt-1 text-sm text-white">
                                    <ul className="border border-white/20 rounded-md divide-y divide-white/10 bg-white/5">
                                        {complaint.attachments.map((file) => (
                                            <li key={file.fileId} className="pl-3 pr-4 py-3 flex items-center justify-between text-sm">
                                                <div className="w-0 flex-1 flex items-center">
                                                    <span className="ml-2 flex-1 w-0 truncate text-white">{file.name}</span>
                                                </div>
                                                <div className="ml-4 flex-shrink-0">
                                                    <a href={file.webViewLink} target="_blank" rel="noopener noreferrer" className="font-medium text-primary-300 hover:text-white transition-colors">
                                                        View
                                                    </a>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                </dd>
                            </div>
                        )}

                        <div className="sm:col-span-1">
                            <dt className="text-sm font-medium text-primary-200">Category</dt>
                            <dd className="mt-1 text-sm text-white">
                                {complaint.category === 'General' && !complaint.aiSummary ? (
                                    <span className="inline-flex items-center text-purple-300 animate-pulse">
                                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                        AI Analyzing...
                                    </span>
                                ) : (
                                    complaint.category
                                )}
                            </dd>
                        </div>
                        <div className="sm:col-span-1">
                            <dt className="text-sm font-medium text-primary-200">Priority</dt>
                            <dd className="mt-1 text-sm text-white capitalize">{complaint.priority}</dd>
                        </div>

                        {isOfficial && (
                            <div className="sm:col-span-1">
                                <dt className="text-sm font-medium text-primary-200">Assigned To</dt>
                                <dd className="mt-1 text-sm text-white">
                                    <input
                                        type="text"
                                        placeholder="Official ID/Name"
                                        value={complaint.assignedTo || ''}
                                        onChange={(e) => handleAssignmentChange(e.target.value)}
                                        className="shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm bg-white/10 border-white/20 rounded-md text-white placeholder-white/40"
                                    />
                                </dd>
                            </div>
                        )}

                        <div className="sm:col-span-2">
                            <dt className="text-sm font-medium text-primary-200">Description</dt>
                            <dd className="mt-1 text-sm text-white whitespace-pre-wrap">{complaint.description}</dd>
                        </div>
                        {complaint.aiSummary && (
                            <div className="sm:col-span-2 bg-purple-500/20 border border-purple-500/30 p-3 rounded-md">
                                <dt className="text-sm font-medium text-purple-200">AI Summary</dt>
                                <dd className="mt-1 text-sm text-purple-100">{complaint.aiSummary}</dd>
                            </div>
                        )}

                        {/* Proof of Resolution Display & Community Evidence */}
                        {(complaint.resolutionProof || (complaint as any).citizen_proof_url) && (
                            <div className="sm:col-span-2 space-y-4">
                                <dt className="text-sm font-medium text-primary-200 mb-2">Evidence Comparison</dt>
                                {/* Side-by-Side Comparison */}
                                <div className="col-span-1 sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {/* Original Image */}
                                    <div className="bg-white/5 p-4 rounded-md border border-white/10">
                                        <h4 className="text-sm font-medium text-primary-200 mb-2">Original Complaint</h4>
                                        {complaint.attachments && complaint.attachments.length > 0 ? (
                                            <a href={complaint.attachments[0].webViewLink} target="_blank" rel="noopener noreferrer" className="block">
                                                <img src={complaint.attachments[0].thumbnailLink || complaint.attachments[0].webViewLink} alt="Original" className="w-full h-48 object-cover rounded-md border border-white/20" />
                                            </a>
                                        ) : (
                                            <div className="w-full h-48 bg-white/5 rounded-md flex items-center justify-center text-white/30 text-sm">No Image</div>
                                        )}
                                    </div>

                                    {/* Resolution Image */}
                                    <div className="bg-green-500/10 p-4 rounded-md border border-green-500/30 relative">
                                        <h4 className="text-sm font-medium text-green-200 mb-2 flex items-center justify-between">
                                            <span className="flex items-center"><CheckCircle className="h-4 w-4 mr-1" /> Resolution Proof</span>
                                            {/* AI Verdict Badge */}
                                            {complaint.verification && complaint.verification.aiVerdict && (
                                                <span className={clsx("px-2 py-0.5 text-xs rounded-full border",
                                                    complaint.verification.aiVerdict === 'LIKELY_MATCH' ? "bg-green-500/20 text-green-100 border-green-500/50" :
                                                        complaint.verification.aiVerdict === 'LIKELY_FAKE' ? "bg-red-500/20 text-red-100 border-red-500/50" :
                                                            "bg-yellow-500/20 text-yellow-100 border-yellow-500/50"
                                                )}>
                                                    AI: {complaint.verification.aiVerdict?.replace('_', ' ') || 'Unknown'}
                                                </span>
                                            )}
                                        </h4>
                                        {complaint.resolutionProof ? (
                                            <div className="flex flex-col space-y-2">
                                                <a href={complaint.resolutionProof.webViewLink} target="_blank" rel="noopener noreferrer" className="block">
                                                    <img src={complaint.resolutionProof.thumbnailLink || complaint.resolutionProof.webViewLink} alt="Resolution" className="w-full h-48 object-cover rounded-md border border-green-500/30" />
                                                </a>
                                                {complaint.resolutionProof.description && (
                                                    <p className="text-green-100 italic text-sm">"{complaint.resolutionProof.description}"</p>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="w-full h-48 bg-white/5 rounded-md flex items-center justify-center text-white/30 text-sm">No Proof Yet</div>
                                        )}
                                    </div>
                                </div>

                                {/* AI Reason Display */}
                                {complaint.verification && complaint.verification.aiReason && (
                                    <div className="col-span-1 sm:col-span-2 bg-white/5 p-3 rounded-md border border-white/10 text-xs text-primary-200">
                                        <span className="font-semibold text-primary-100">AI Analysis:</span> {complaint.verification.aiReason}
                                    </div>
                                )}

                                {/* Citizen Counter-Proof (Existing) */}
                                {(complaint as any).citizen_proof_url && (
                                    <div className="col-span-1 sm:col-span-2 bg-blue-500/10 p-4 rounded-md border border-blue-500/30 backdrop-blur-sm">
                                        <h4 className="text-sm font-medium text-blue-200 mb-2 flex items-center">
                                            <User className="h-4 w-4 mr-1" /> Citizen Counter-Proof
                                        </h4>
                                        <div className="flex flex-col space-y-2">
                                            <a href={(complaint as any).citizen_proof_url} target="_blank" rel="noopener noreferrer" className="block">
                                                <img src={(complaint as any).citizen_proof_url} alt="Citizen Proof" className="w-full h-48 object-cover rounded-md border border-blue-500/30" />
                                            </a>
                                            <p className="text-xs text-blue-100">Uploaded by community member</p>
                                        </div>
                                    </div>
                                )}

                                {/* Upload UI for Citizen (Existing) */}
                                {(!isOfficial && (complaint.status === 'pending_verification' || complaint.status === 'resolved') && !(complaint as any).citizen_proof_url) && (
                                    <div className="col-span-1 sm:col-span-2 bg-white/5 p-4 rounded-md border border-white/20 flex flex-col justify-center items-center text-center hover:bg-white/10 transition-colors">
                                        <Camera className="h-8 w-8 text-primary-300 mb-2" />
                                        <p className="text-sm text-primary-100 mb-2">Have proof it's NOT fixed?</p>
                                        <div className="flex items-center space-x-2">
                                            <input
                                                type="file"
                                                onChange={(e) => setCitizenProofFile(e.target.files?.[0] || null)}
                                                className="text-xs text-primary-200 file:mr-2 file:py-1 file:px-2 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-primary-500/20 file:text-primary-100 hover:file:bg-primary-500/30"
                                            />
                                            {citizenProofFile && (
                                                <button
                                                    onClick={handleUploadCitizenProof}
                                                    disabled={uploadingProof}
                                                    className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:opacity-50"
                                                >
                                                    {uploadingProof ? '...' : 'Upload'}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Community Voting & Watchdog Actions */}
                                {(!isOfficial && (complaint.status === 'pending_verification' || complaint.status === 'resolved')) && (
                                    <div className="mt-4 flex justify-between items-center bg-white/5 p-3 rounded-md border border-white/10">
                                        <div className="text-sm text-primary-100">
                                            Community Verdict:
                                        </div>
                                        <div className="flex space-x-3">
                                            <button
                                                onClick={() => handleVoteResolution('looks_fixed')}
                                                className="flex items-center space-x-1 px-3 py-1 bg-white/10 border border-white/20 rounded-full text-sm hover:bg-green-500/20 text-green-300 transition-colors"
                                            >
                                                <ThumbsUp className="h-4 w-4" />
                                                <span>Looks Fixed</span>
                                            </button>
                                            <button
                                                onClick={() => handleVoteResolution('not_fixed')}
                                                className="flex items-center space-x-1 px-3 py-1 bg-white/10 border border-white/20 rounded-full text-sm hover:bg-red-500/20 text-red-300 transition-colors"
                                            >
                                                <ThumbsDown className="h-4 w-4" />
                                                <span>Not Fixed</span>
                                            </button>
                                            <button
                                                onClick={handleVoteDispute}
                                                className="flex items-center space-x-1 px-3 py-1 bg-red-500/10 border border-red-500/30 rounded-full text-sm hover:bg-red-500/20 text-red-300 ml-4 transition-colors"
                                                title="Flag this complaint if resolution is fake"
                                            >
                                                <AlertTriangle className="h-4 w-4" />
                                                <span>Dispute / Flag</span>
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="sm:col-span-2">
                            <dt className="text-sm font-medium text-primary-200 mb-2">Location</dt>
                            <dd className="mt-1 text-sm text-white">
                                {complaint.location ? (
                                    <>
                                        <p className="mb-2">{complaint.location.address}</p>
                                        {(complaint.location.stateName || complaint.location.districtName) && (
                                            <div className="mb-2 flex items-center space-x-2 text-xs text-primary-300">
                                                <span className="bg-white/10 px-2 py-1 rounded-full border border-white/20">
                                                    {complaint.location.stateName || 'Unknown State'}
                                                </span>
                                                <span>•</span>
                                                <span className="bg-white/10 px-2 py-1 rounded-full border border-white/20">
                                                    {complaint.location.districtName || 'Unknown District'}
                                                </span>
                                            </div>
                                        )}
                                        <div className="h-64 w-full rounded-md overflow-hidden border border-white/20">
                                            <MapContainer
                                                center={[complaint.location.lat || 0, complaint.location.lng || 0]}
                                                zoom={15}
                                                style={{ height: '100%', width: '100%' }}
                                                dragging={false}
                                                scrollWheelZoom={false}
                                            >
                                                <TileLayer
                                                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                                />
                                                <Marker position={[complaint.location.lat || 0, complaint.location.lng || 0]} icon={defaultIcon} />
                                            </MapContainer>
                                        </div>
                                    </>
                                ) : (
                                    <p className="text-gray-400">Location data unavailable</p>
                                )}
                            </dd>
                        </div>
                    </dl>
                </div>
                {/* Status History */}
                <div className="border-t border-white/10 px-4 py-5 sm:px-6">
                    <ComplaintTimeline complaintId={id!} />
                </div>
            </div>

            {/* Notes Section */}
            <div className="bg-white/10 backdrop-blur-md shadow-xl sm:rounded-lg border border-white/20">
                <div className="px-4 py-5 sm:px-6">
                    <h3 className="text-lg leading-6 font-medium text-white drop-shadow-md">Activity & Comments</h3>
                </div>
                <div className="border-t border-white/10 px-4 py-5 sm:px-6">
                    <ul className="space-y-4">
                        {notes.map((note) => (
                            <li key={note.id} className="bg-white/5 rounded-lg p-4 border border-white/10">
                                <div className="flex space-x-3">
                                    <div className="flex-shrink-0">
                                        <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center">
                                            <User className="h-5 w-5 text-white" />
                                        </div>
                                    </div>
                                    <div className="flex-1 space-y-1">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-sm font-medium text-white">{note.userName}</h3>
                                            <p className="text-sm text-primary-200">{note.createdAt?.toDate ? format(note.createdAt.toDate(), 'PPpp') : 'Just now'}</p>
                                        </div>
                                        <p className="text-sm text-primary-100">{note.content}</p>
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>

                    <div className="mt-6">
                        <form onSubmit={handleAddNote} className="flex gap-4">
                            <input
                                type="text"
                                value={newNote}
                                onChange={(e) => setNewNote(e.target.value)}
                                placeholder="Add a comment..."
                                className="shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm bg-white/10 border-white/20 rounded-md text-white placeholder-white/40"
                            />
                            <button
                                type="submit"
                                disabled={sendingNote || !newNote.trim()}
                                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-primary-900 bg-white hover:bg-primary-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
                            >
                                <Send className="h-4 w-4" />
                            </button>
                        </form>
                    </div>
                </div>
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
                                    <CheckCircle className="h-6 w-6 text-green-600" aria-hidden="true" />
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
