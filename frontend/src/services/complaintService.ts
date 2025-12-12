import {
    collection,
    addDoc,
    query,
    where,
    getDocs,
    doc,
    getDoc,
    updateDoc,
    orderBy,
    serverTimestamp,
    Timestamp,
    onSnapshot
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';

export interface Complaint {
    id?: string;
    userId: string;
    title: string;
    description: string;
    category: string;
    location: {
        lat: number;
        lng: number;
        address: string;
        stateName?: string;
        stateCode?: string;
        districtName?: string;
        districtCode?: string;
        wardCode?: string;
    };
    status: 'submitted' | 'in_review' | 'in_progress' | 'resolved' | 'rejected' | 'reopened' | 'flagged';
    priority: 'low' | 'medium' | 'high';
    createdAt: Timestamp;
    updatedAt: Timestamp;
    aiSummary?: string;
    attachments?: {
        fileId: string;
        webViewLink: string;
        thumbnailLink: string;
        name: string;
        type?: 'image' | 'audio' | 'video';
        url?: string;
    }[];
    assignedTo?: string; // UID of the official
    department?: string;
    upvotes?: number;
    upvotedBy?: string[]; // Array of user UIDs
    targetResolutionDate?: Timestamp;
    resolutionProof?: {
        fileId: string;
        webViewLink: string;
        thumbnailLink: string;
        name: string;
        description?: string;
        uploadedAt?: Timestamp;
        proofLocationMismatch?: boolean;
        proofLocationDistance?: number;
    };
    verificationDeadline?: Timestamp;
    timesReopened?: number;
    isEscalated?: boolean;
    escalationTriggered?: boolean;
    isOverdue?: boolean;
    isAnonymous?: boolean;
    anonymousDisplayId?: string;
    duplicateOf?: string | null;
    supportCount?: number;
    // Transcription Fields
    transcript?: string | null;
    transcriptionStatus?: 'not_requested' | 'pending' | 'completed' | 'failed';
    recordingUrl?: string;
    transcriptionRequestedAt?: Timestamp;
    transcriptionCompletedAt?: Timestamp;

    verification?: {
        aiScore: number;
        aiVerdict: 'LIKELY_MATCH' | 'UNCERTAIN' | 'LIKELY_FAKE';
        aiReason: string;
        needsCommunityVote: boolean;
    };
    source?: 'web' | 'whatsapp';
    rejectionReason?: string;
}

export interface ComplaintNote {
    id: string;
    complaintId: string;
    userId: string;
    userName: string;
    content: string;
    isPublic: boolean;
    createdAt: Timestamp;
}

const API_BASE_URL = 'http://localhost:5000/api';

export const createComplaint = async (complaintData: Omit<Complaint, 'id' | 'createdAt' | 'updatedAt' | 'status'>) => {
    try {
        const response = await fetch(`${API_BASE_URL}/complaints`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(complaintData),
        });

        if (!response.ok) {
            throw new Error('Failed to create complaint');
        }

        const data = await response.json();
        return data.id;
    } catch (error) {
        console.error("Error creating complaint:", error);
        throw error;
    }
};

export const getUserComplaints = async (userId: string) => {
    try {
        const q = query(
            collection(db, 'complaints'),
            where('userId', '==', userId)
        );
        const querySnapshot = await getDocs(q);
        const complaints = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Complaint));
        // Client-side sort
        return complaints.sort((a, b) => {
            const dateA = a.createdAt?.toDate().getTime() || 0;
            const dateB = b.createdAt?.toDate().getTime() || 0;
            return dateB - dateA;
        });
    } catch (error) {
        console.error("Error fetching complaints:", error);
        throw error;
    }
};

export const getAllComplaints = async () => {
    try {
        const q = query(collection(db, 'complaints'), orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Complaint));
    } catch (error) {
        console.error("Error fetching all complaints:", error);
        throw error;
    }
};

export const subscribeToAllComplaints = (callback: (complaints: Complaint[]) => void) => {
    const q = query(collection(db, 'complaints'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
        const complaints = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Complaint));
        callback(complaints);
    }, (error) => {
        console.error("Error subscribing to complaints:", error);
    });
};

export const getComplaintById = async (id: string) => {
    try {
        const docRef = doc(db, 'complaints', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return { id: docSnap.id, ...docSnap.data() } as Complaint;
        } else {
            return null;
        }
    } catch (error) {
        console.error("Error fetching complaint:", error);
        throw error;
    }
};

export const subscribeToComplaint = (id: string, callback: (complaint: Complaint) => void) => {
    const docRef = doc(db, 'complaints', id);
    return onSnapshot(docRef, (docSnap) => {
        console.log("Snapshot update received for:", id, "Exists:", docSnap.exists());
        if (docSnap.exists()) {
            const data = docSnap.data();
            console.log("Snapshot data:", data);
            callback({ id: docSnap.id, ...data } as Complaint);
        }
    });
};

export const updateComplaint = async (id: string, data: Partial<Complaint>) => {
    try {
        const response = await fetch(`${API_BASE_URL}/complaints/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...data, actorId: auth.currentUser?.uid })
        });
        if (!response.ok) throw new Error('Failed to update complaint');
    } catch (error) {
        console.error("Error updating complaint:", error);
        throw error;
    }
};

export const addComplaintNote = async (complaintId: string, note: Omit<ComplaintNote, 'id' | 'createdAt'>) => {
    try {
        await addDoc(collection(db, `complaints/${complaintId}/notes`), {
            ...note,
            createdAt: serverTimestamp()
        });
    } catch (error) {
        console.error("Error adding note:", error);
        throw error;
    }
};

export const getComplaintNotes = async (complaintId: string) => {
    try {
        const q = query(collection(db, `complaints/${complaintId}/notes`), orderBy('createdAt', 'asc'));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ComplaintNote));
    } catch (error) {
        console.error("Error fetching notes:", error);
        throw error;
    }
};

export const uploadComplaintAttachment = async (file: File) => {
    try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(`${API_BASE_URL}/upload`, {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            throw new Error('Upload failed');
        }

        const data = await response.json();

        return {
            fileId: data.fileId,
            webViewLink: data.url,
            thumbnailLink: data.url, // Supabase doesn't auto-generate thumbnails, use same URL
            name: data.name
        };
    } catch (error) {
        console.error("Error uploading attachment:", error);
        throw error;
    }
};

export const upvoteComplaint = async (complaintId: string, userId: string) => {
    try {
        const docRef = doc(db, 'complaints', complaintId);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) throw new Error("Complaint not found");

        const data = docSnap.data() as Complaint;
        const upvotedBy = data.upvotedBy || [];

        if (upvotedBy.includes(userId)) {
            // Remove upvote
            await updateDoc(docRef, {
                upvotes: (data.upvotes || 0) - 1,
                upvotedBy: upvotedBy.filter(id => id !== userId)
            });
        } else {
            // Add upvote
            await updateDoc(docRef, {
                upvotes: (data.upvotes || 0) + 1,
                upvotedBy: [...upvotedBy, userId]
            });
        }
    } catch (error) {
        console.error("Error toggling upvote:", error);
        throw error;
    }
};
export const getAdminComplaints = async (filters: { status?: string; priority?: string; limit?: number; startAfter?: string; state?: string; district?: string; ward?: string }) => {
    try {
        const params = new URLSearchParams();
        if (filters.status) params.append('status', filters.status);
        if (filters.priority) params.append('priority', filters.priority);
        if (filters.limit) params.append('limit', filters.limit.toString());
        if (filters.state) params.append('state', filters.state);
        if (filters.district) params.append('district', filters.district);
        if (filters.ward) params.append('ward', filters.ward);
        // startAfter not fully implemented in backend for cursor yet, but we can pass it

        const response = await fetch(`${API_BASE_URL}/complaints?${params.toString()}`, {
            headers: {
                'x-user-id': auth.currentUser?.uid || ''
            }
        });
        if (!response.ok) throw new Error('Failed to fetch admin complaints');

        const complaints = await response.json();
        // Convert timestamp strings to Firestore Timestamps if needed by UI, or handle in UI.
        // The UI likely expects Firestore Timestamps because of existing code.
        // We might need to map them back to Timestamp objects if the UI relies on .toDate()
        return complaints.map((c: any) => ({
            ...c,
            createdAt: c.createdAt ? Timestamp.fromMillis(new Date(c.createdAt._seconds * 1000 + c.createdAt._nanoseconds / 1000000).getTime()) : null,
            updatedAt: c.updatedAt ? Timestamp.fromMillis(new Date(c.updatedAt._seconds * 1000 + c.updatedAt._nanoseconds / 1000000).getTime()) : null,
        }));
    } catch (error) {
        console.error("Error fetching admin complaints:", error);
        throw error;
    }
};

export const getAdminStats = async () => {
    try {
        const response = await fetch(`${API_BASE_URL}/complaints/admin/stats`, {
            headers: {
                'x-user-id': auth.currentUser?.uid || ''
            }
        });
        if (!response.ok) throw new Error('Failed to fetch admin stats');
        return await response.json();
    } catch (error) {
        console.error("Error fetching admin stats:", error);
        throw error;
    }
};

export const getComplaintTimeline = async (id: string) => {
    try {
        const response = await fetch(`${API_BASE_URL}/complaints/${id}/timeline`);
        if (!response.ok) throw new Error('Failed to fetch timeline');
        const activities = await response.json();
        return activities.map((a: any) => ({
            ...a,
            timestamp: a.timestamp ? Timestamp.fromMillis(new Date(a.timestamp._seconds * 1000 + a.timestamp._nanoseconds / 1000000).getTime()) : null
        }));
    } catch (error) {
        console.error("Error fetching timeline:", error);
        throw error;
    }
};

export const resolveComplaint = async (id: string, proofData: any, adminLocation?: { lat: number; lng: number } | null) => {
    try {
        const response = await fetch(`${API_BASE_URL}/complaints/${id}/resolve`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ proof: proofData, actorId: auth.currentUser?.uid, adminLocation })
        });
        if (!response.ok) throw new Error('Failed to resolve complaint');
    } catch (error) {
        console.error("Error resolving complaint:", error);
        throw error;
    }
};

export const reopenComplaint = async (id: string, actorId: string, reason: string) => {
    try {
        const response = await fetch(`${API_BASE_URL}/complaints/${id}/reopen`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ actorId, reason })
        });
        if (!response.ok) throw new Error('Failed to reopen complaint');
    } catch (error) {
        console.error("Error reopening complaint:", error);
        throw error;
    }
};

export const rejectComplaint = async (id: string, actorId: string, reason: string) => {
    try {
        const response = await fetch(`${API_BASE_URL}/complaints/${id}/reject`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ actorId, reason })
        });
        if (!response.ok) throw new Error('Failed to reject complaint');
    } catch (error) {
        console.error("Error rejecting complaint:", error);
        throw error;
    }
};

export const getPublicStats = async () => {
    try {
        const response = await fetch(`${API_BASE_URL}/complaints/public/stats`);
        if (!response.ok) throw new Error('Failed to fetch public stats');
        return await response.json();
    } catch (error) {
        console.error("Error fetching public stats:", error);
        throw error;
    }
};

export const getEscalatedComplaints = async (): Promise<Complaint[]> => {
    try {
        const response = await fetch(`${API_BASE_URL}/complaints/escalated`, {
            headers: {
                'x-user-id': auth.currentUser?.uid || ''
            }
        });
        if (!response.ok) throw new Error('Failed to fetch escalated complaints');
        const data = await response.json();
        return data.map((c: any) => ({
            ...c,
            createdAt: c.createdAt ? new Timestamp(c.createdAt._seconds, c.createdAt._nanoseconds) : null,
            updatedAt: c.updatedAt ? new Timestamp(c.updatedAt._seconds, c.updatedAt._nanoseconds) : null,
        }));
    } catch (error) {
        console.error("Error fetching escalated complaints:", error);
        throw error;
    }
};

export const getPublicFeed = async () => {
    try {
        const response = await fetch(`${API_BASE_URL}/complaints/public/feed`);
        if (!response.ok) throw new Error('Failed to fetch public feed');
        return await response.json();
    } catch (error) {
        console.error("Error fetching public feed:", error);
        throw error;
    }
};

export const transcribeComplaint = async (id: string) => {
    try {
        const response = await fetch(`${API_BASE_URL}/complaints/${id}/transcribe`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-user-id': auth.currentUser?.uid || ''
            }
        });
        if (!response.ok) throw new Error('Failed to transcribe complaint');
        return await response.json();
    } catch (error) {
        console.error("Error transcribing complaint:", error);
        throw error;
    }
};

export const transcribeAudio = async (audioBlob: Blob) => {
    try {
        const formData = new FormData();
        formData.append('audio', audioBlob, 'recording.webm');

        const token = await auth.currentUser?.getIdToken();

        const response = await fetch(`${API_BASE_URL}/complaints/transcribe-audio`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });

        if (!response.ok) {
            throw new Error('Transcription failed');
        }

        return await response.json();
    } catch (error) {
        console.error("Error transcribing audio:", error);
        throw error;
    }
};

