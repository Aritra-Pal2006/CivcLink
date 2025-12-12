import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
    updateComplaint,
    addComplaintNote,
    getComplaintNotes,
    resolveComplaint,
    reopenComplaint,
    rejectComplaint,
    transcribeComplaint,
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
import { ArrowLeft, Send, User, CheckCircle, Loader2, AlertTriangle } from 'lucide-react';
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

    const isAdmin = userProfile?.role === 'admin';

    useEffect(() => {
        let unsubscribe: () => void;

        const fetchData = async () => {
            if (id) {
                try {
                    const notesData = await getComplaintNotes(id);
                    setNotes(notesData);

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

    const [showRejectModal, setShowRejectModal] = useState(false);
    const [rejectReason, setRejectReason] = useState('');
    const [rejecting, setRejecting] = useState(false);

    const [transcribing, setTranscribing] = useState(false);



    const handleStatusChange = async (newStatus: string) => {
        if (!complaint || !id) return;

        if (newStatus === 'resolved') {
            setShowResolveModal(true);
            return;
        }

        if (newStatus === 'rejected') {
            setShowRejectModal(true);
            return;
        }

        try {
            await updateComplaint(id, { status: newStatus as any });
            // Optimistic update
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
            // Capture Admin Location
            let adminLocation = null;
            try {
                const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
                    navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
                });
                adminLocation = {
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude
                };
            } catch (geoError) {
                console.warn("Could not get admin location", geoError);
            }

            const { uploadComplaintAttachment } = await import('../../services/complaintService');
            const result = await uploadComplaintAttachment(resolveProofFile);

            const proofData = {
                ...result,
                name: resolveProofFile.name,
                description: resolveNote,
                uploadedAt: Timestamp.now()
            };

            // Call resolve endpoint
            await resolveComplaint(id, proofData, adminLocation);

            setShowResolveModal(false);
            // Status update will come via subscription
        } catch (error: any) {
            console.error("Failed to resolve", error);
            // Show specific error (e.g., GPS mismatch)
            alert(error.message || "Failed to submit resolution proof");
        } finally {
            setResolving(false);
        }
    };

    const handleRejectSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!complaint || !id || !userProfile || !rejectReason) return;

        setRejecting(true);
        try {
            await rejectComplaint(id, userProfile.uid, rejectReason);
            setShowRejectModal(false);
            setRejectReason('');
        } catch (error) {
            console.error("Failed to reject", error);
            alert("Failed to reject complaint");
        } finally {
            setRejecting(false);
        }
    };

    const handleReopen = async () => {
        if (!complaint || !id || !userProfile) return;

        const reason = prompt("Please provide a reason for reopening this complaint:");
        if (!reason) return;

        try {
            await reopenComplaint(id, userProfile.uid, reason);
        } catch (error) {
            alert("Failed to reopen complaint");
        }
    };


    const handleTranscribe = async () => {
        if (!complaint || !id) return;
        setTranscribing(true);
        try {
            const res = await transcribeComplaint(id);
            // Optimistic update or wait for subscription
            if (res.transcript) {
                setComplaint(prev => prev ? ({
                    ...prev,
                    transcript: res.transcript,
                    transcriptionStatus: 'completed'
                }) : null);
            } else {
                // Trigger reload or wait for subscription
            }
        } catch (error) {
            console.error("Transcription failed", error);
            alert("Transcription failed");
        } finally {
            setTranscribing(false);
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

    if (loading) return <div className="p-8 text-center">Loading...</div>;
    if (!complaint) return <div className="p-8 text-center text-red-500">Complaint not found</div>;

    const isOwner = userProfile?.uid === complaint.userId;

    return (
        <div className="max-w-4xl mx-auto space-y-6 relative">
            <Link to="/complaints" className="inline-flex items-center text-sm text-primary-200 hover:text-white transition-colors">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Complaints
            </Link>

            {/* Reopen Button for Resolved Complaints (Citizen) */}
            {isOwner && complaint.status === 'resolved' && (
                <div className="bg-white/10 backdrop-blur-md p-4 rounded-md border border-white/20 flex justify-between items-center shadow-lg">
                    <span className="text-sm text-primary-100">Issue persists? You can request to reopen this complaint.</span>
                    <button
                        onClick={handleReopen}
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
                                This complaint has been reopened for further review.
                                {complaint.timesReopened && complaint.timesReopened > 0 && (
                                    <span className="font-bold ml-1">(Reopened {complaint.timesReopened} times)</span>
                                )}
                            </p>
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
                        <span className={clsx("px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full capitalize",
                            complaint.status === 'resolved' ? 'bg-green-500/20 text-green-100 border border-green-500/30' :
                                complaint.status === 'reopened' ? 'bg-red-500/20 text-red-100 border border-red-500/30' :
                                    complaint.status === 'in_progress' ? 'bg-blue-500/20 text-blue-100 border border-blue-500/30' :
                                        complaint.status === 'rejected' ? 'bg-red-900/50 text-red-100 border border-red-500/50' :
                                            'bg-yellow-500/20 text-yellow-100 border border-yellow-500/30')}>
                            {complaint.status.replace('_', ' ')}
                        </span>
                        {complaint.isOverdue && (
                            <span className="px-3 py-1 inline-flex text-sm leading-5 font-bold rounded-full bg-red-600 text-white animate-pulse border border-red-700 shadow-sm">
                                OVERDUE
                            </span>
                        )}

                        {/* Admin Status Controls */}
                        {isAdmin && (
                            <select
                                value={complaint.status}
                                onChange={(e) => handleStatusChange(e.target.value)}
                                className="ml-2 block pl-3 pr-10 py-1 text-base bg-white/10 border-white/20 text-white focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
                            >
                                <option value="submitted" className="text-gray-900">Submitted</option>
                                <option value="in_progress" className="text-gray-900">In Progress</option>
                                <option value="resolved" className="text-gray-900">Resolved</option>
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

                        {isAdmin && (
                            <div className="sm:col-span-1">
                                <dt className="text-sm font-medium text-primary-200">Reporter</dt>
                                <dd className="mt-1 text-sm text-white">
                                    {complaint.isAnonymous ? (
                                        <span className="italic text-gray-400">Anonymous ({complaint.anonymousDisplayId || 'Hidden'})</span>
                                    ) : (
                                        <span>User: {complaint.userId}</span>
                                    )}
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


                        {/* Transcription Section */}
                        {(complaint.recordingUrl || (complaint.attachments && complaint.attachments.some(a => a.type === 'audio' || a.name.match(/\.(mp3|wav|m4a|ogg)$/i)))) && (
                            <div className="sm:col-span-2 bg-blue-900/20 border border-blue-500/30 p-4 rounded-md">
                                <div className="flex justify-between items-start mb-2">
                                    <dt className="text-sm font-medium text-blue-200 flex items-center gap-2">
                                        <div className="h-2 w-2 rounded-full bg-blue-400 animate-pulse"></div>
                                        Audio Transcription
                                    </dt>
                                    {isAdmin && (!complaint.transcriptionStatus || complaint.transcriptionStatus === 'not_requested' || complaint.transcriptionStatus === 'failed') && (
                                        <button
                                            onClick={handleTranscribe}
                                            disabled={transcribing}
                                            className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded transition-colors disabled:opacity-50"
                                        >
                                            {transcribing ? 'Transcribing...' : 'Request Transcription'}
                                        </button>
                                    )}
                                </div>

                                {complaint.transcriptionStatus === 'pending' && (
                                    <div className="flex items-center text-blue-300 text-sm py-2">
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Transcription in progress...
                                    </div>
                                )}

                                {complaint.transcriptionStatus === 'completed' && complaint.transcript && (
                                    <dd className="mt-1 text-sm text-blue-100 italic border-l-2 border-blue-500 pl-3">
                                        "{complaint.transcript}"
                                    </dd>
                                )}

                                {complaint.transcriptionStatus === 'failed' && (
                                    <div className="text-red-400 text-sm mt-1">
                                        Transcription failed. Please try again.
                                    </div>
                                )}
                            </div>
                        )}


                        {complaint.status === 'rejected' && (
                            <div className="sm:col-span-2 bg-red-900/40 border border-red-500/50 p-4 rounded-md">
                                <dt className="text-sm font-bold text-red-200 flex items-center">
                                    <AlertTriangle className="h-5 w-5 mr-2" />
                                    Complaint Rejected
                                </dt>
                                <dd className="mt-2 text-sm text-red-100">
                                    Reason: <span className="font-medium">{complaint.rejectionReason || 'No reason provided'}</span>
                                </dd>
                            </div>
                        )}

                        {/* Proof of Resolution Display */}
                        {complaint.resolutionProof && (
                            <div className="sm:col-span-2 space-y-4">
                                <dt className="text-sm font-medium text-primary-200 mb-2">Resolution Proof</dt>
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
                                        </h4>
                                        <div className="flex flex-col space-y-2">
                                            <a href={complaint.resolutionProof.webViewLink} target="_blank" rel="noopener noreferrer" className="block">
                                                <img src={complaint.resolutionProof.thumbnailLink || complaint.resolutionProof.webViewLink} alt="Resolution" className="w-full h-48 object-cover rounded-md border border-green-500/30" />
                                            </a>
                                            {complaint.resolutionProof.description && (
                                                <p className="text-green-100 italic text-sm">"{complaint.resolutionProof.description}"</p>
                                            )}
                                            {complaint.resolutionProof.proofLocationMismatch && (
                                                <div className="mt-2 bg-red-500/20 border border-red-500/50 p-2 rounded text-red-100 text-xs flex items-start">
                                                    <span className="font-bold mr-1">⚠ Warning:</span>
                                                    Proof uploaded {complaint.resolutionProof.proofLocationDistance}m away from complaint location.
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="sm:col-span-2">
                            <dt className="text-sm font-medium text-primary-200 mb-2">Location</dt>
                            <dd className="mt-1 text-sm text-white">
                                {complaint.location ? (
                                    <>
                                        <p className="mb-2">{complaint.location.address}</p>
                                        {complaint.location.wardCode && (
                                            <p className="mb-2 text-xs font-semibold text-primary-300 bg-white/5 inline-block px-2 py-1 rounded border border-white/10">
                                                Ward: {complaint.location.wardCode}
                                            </p>
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
            {/* Reject Modal */}
            {showRejectModal && (
                <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
                    <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={() => setShowRejectModal(false)}></div>
                        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
                        <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
                            <div>
                                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                                    <AlertTriangle className="h-6 w-6 text-red-600" aria-hidden="true" />
                                </div>
                                <div className="mt-3 text-center sm:mt-5">
                                    <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">Reject Complaint</h3>
                                    <div className="mt-2">
                                        <p className="text-sm text-gray-500">
                                            Are you sure you want to reject this complaint? This action cannot be undone easily.
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <form onSubmit={handleRejectSubmit} className="mt-5 sm:mt-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Rejection Reason (Required)</label>
                                    <textarea
                                        required
                                        rows={3}
                                        value={rejectReason}
                                        onChange={(e) => setRejectReason(e.target.value)}
                                        className="mt-1 shadow-sm focus:ring-red-500 focus:border-red-500 block w-full sm:text-sm border-gray-300 rounded-md"
                                        placeholder="Why is this complaint being rejected?"
                                    />
                                </div>
                                <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
                                    <button
                                        type="submit"
                                        disabled={rejecting}
                                        className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:col-start-2 sm:text-sm disabled:opacity-50"
                                    >
                                        {rejecting ? 'Rejecting...' : 'Confirm Rejection'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setShowRejectModal(false)}
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
