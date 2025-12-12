import { Request, Response } from 'express';
import * as admin from 'firebase-admin';
import { lookupAdminArea } from '../utils/geoTagger';
import { getImageHash } from '../utils/imageUtils';
import { aiManager } from '../services/ai/aiManager';
import { getCurrentUserRole } from '../utils/roleHelper';
import { sendWhatsAppMessage, sendLocalizedWhatsAppMessage } from '../services/whatsappService';
import { calculateDistance } from '../utils/geoUtils';
import { createClient } from '@deepgram/sdk';

const deepgram = createClient(process.env.DEEPGRAM_API_KEY || '');


const db = admin.firestore();

// Helper to log activity
const logActivity = async (
    complaintId: string,
    type: 'created' | 'ai_analyzed' | 'admin_updated' | 'admin_resolved' | 'citizen_verified' | 'citizen_reopened',
    actorId: string,
    actorRole: 'citizen' | 'admin' | 'system',
    meta: any = {},
    note?: string
) => {
    try {
        await db.collection(`complaints/${complaintId}/complaintActivity`).add({
            type,
            actorId,
            actorRole,
            note: note || null,
            meta,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
    } catch (error) {
        console.error(`Failed to log activity ${type} for complaint ${complaintId}:`, error);
    }
};

// Helper to get user phone
const getUserPhone = async (userId: string): Promise<string | null> => {
    try {
        const userDoc = await db.collection('users').doc(userId).get();
        if (userDoc.exists) {
            return userDoc.data()?.phoneNumber || null;
        }
        const userRecord = await admin.auth().getUser(userId);
        return userRecord.phoneNumber || null;
    } catch (error) {
        console.error("Error fetching user phone:", error);
        return null;
    }
};

export const createComplaint = async (req: Request, res: Response) => {
    try {
        const { userId, title, description, category, location, priority, attachments, isAnonymous } = req.body;

        if (!userId || !title || !description || !location) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        // Ensure user is citizen (or treat as citizen for creation)
        const { role } = await getCurrentUserRole(userId);

        // Auto-tag State/District
        let adminArea = { stateName: null, stateCode: null, districtName: null, districtCode: null, wardCode: null };
        if (location && location.lat && location.lng) {
            const area = lookupAdminArea(location.lat, location.lng);
            // @ts-ignore
            adminArea = area;

            // MANUAL OVERRIDE: If user provided a ward code, use it!
            if (location.wardCode) {
                // @ts-ignore
                adminArea.wardCode = location.wardCode;
            }
            // Fallback: Assign a DETERMINISTIC Ward Code based on location (for consistency)
            else if (!adminArea.wardCode) {
                // Simple hash: (lat * 1000 + lng * 1000) % 10
                const hash = Math.abs(Math.floor(location.lat * 1000) + Math.floor(location.lng * 1000));
                const wardNum = (hash % 10) + 1;
                // @ts-ignore
                adminArea.wardCode = "WARD_" + wardNum;
            }
        }

        // Duplicate Detection (Simple Radius Check)
        let duplicateOf = null;
        let supportCount = 1; // Default

        if (location && location.lat && location.lng) {
            // OPTIMIZATION: Bounding Box Query (~100m is approx 0.001 degrees)
            // We filter by Latitude in Firestore (Range Filter) and Longitude in Memory
            const lat = location.lat;
            const lng = location.lng;
            const range = 0.001;

            const nearbySnapshot = await db.collection('complaints')
                .where('location.lat', '>=', lat - range)
                .where('location.lat', '<=', lat + range)
                .get();

            for (const doc of nearbySnapshot.docs) {
                const data = doc.data();

                // Filter by status in memory (to avoid composite index requirement)
                if (!['submitted', 'in_progress', 'resolved', 'reopened'].includes(data.status)) {
                    continue;
                }

                if (data.location && data.location.lat && data.location.lng) {
                    // Check Longitude Range in Memory
                    if (data.location.lng < lng - range || data.location.lng > lng + range) continue;

                    const dist = calculateDistance(lat, lng, data.location.lat, data.location.lng);
                    if (dist < 100 && data.category === (category || 'General')) { // 100m radius, same category
                        // Found duplicate!
                        duplicateOf = doc.id;

                        // Increment support count on the PARENT complaint
                        try {
                            await db.collection('complaints').doc(doc.id).update({
                                supportCount: admin.firestore.FieldValue.increment(1)
                            });
                        } catch (e) {
                            console.error("Failed to increment support count on parent", e);
                        }

                        break;
                    }
                }
            }
        }

        const complaintData = {
            userId,
            title,
            description,
            category: category || 'General',
            location: {
                ...location,
                ...adminArea
            },
            priority: priority || 'medium',
            status: 'submitted',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            timesReopened: 0,
            isEscalated: false,
            escalationTriggered: false,
            attachments: attachments || [],
            upvotes: 0,
            upvotedBy: [],
            isAnonymous: !!isAnonymous,
            anonymousDisplayId: isAnonymous ? `User-${userId.slice(0, 6)}` : null,
            duplicateOf: duplicateOf,
            supportCount: 1, // Start with 1 (self)
            isOverdue: false
        };

        const docRef = await db.collection('complaints').add(complaintData);

        // Log 'created' activity
        await logActivity(docRef.id, 'created', userId, 'citizen', {
            initialStatus: 'submitted',
            locationTagged: !!adminArea.districtName,
            isDuplicate: !!duplicateOf
        });

        res.status(201).json({ id: docRef.id, message: "Complaint created successfully" });
    } catch (error: any) {
        console.error("Error creating complaint:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

export const getComplaints = async (req: Request, res: Response) => {
    try {
        // @ts-ignore
        const uid = req.user?.uid || req.headers['x-user-id'] || req.query.userId;

        if (!uid) {
            return res.status(401).json({ error: "Unauthorized: User ID required" });
        }

        const { role, adminLevel, assignedWard, assignedCity } = await getCurrentUserRole(uid);
        const { status, priority, limit, state, district } = req.query;

        let query: admin.firestore.Query = db.collection('complaints');

        if (role === 'citizen') {
            // Citizen sees ONLY their own complaints
            query = query.where('userId', '==', uid);
        } else {
            // Admin sees ALL complaints, apply filters
            if (status) query = query.where('status', '==', status);
            if (priority) query = query.where('priority', '==', priority);
            if (state) query = query.where('location.stateName', '==', state);
            if (district) query = query.where('location.districtName', '==', district);

            // Allow City Admins (or others) to filter by specific ward
            // @ts-ignore
            if (req.query.ward) {
                // @ts-ignore
                query = query.where('location.wardCode', '==', req.query.ward);
            }

            // ROLE HIERARCHY: Ward Admin Filter
            if (adminLevel === 'ward' && assignedWard) {
                const targetWard = assignedWard.trim();
                console.log(`🔒 Filtering complaints for Ward Admin: ${targetWard}`);
                query = query.where('location.wardCode', '==', targetWard);
            }
            // City Admin Filter (if assigned to a specific city)
            else if (adminLevel === 'city' && assignedCity) {
                if (assignedCity === 'Delhi') {
                    // Delhi is a state with multiple districts
                    query = query.where('location.stateName', '==', 'NCTofDelhi');
                } else if (assignedCity === 'Mumbai') {
                    // Mumbai has two districts
                    query = query.where('location.districtName', 'in', ['Mumbai City', 'MumbaiSuburban']);
                } else {
                    // Default: 1-to-1 match with District Name
                    query = query.where('location.districtName', '==', assignedCity);
                }
            }
            else {
                // query = query.orderBy('createdAt', 'desc'); // Removed to avoid index error
            }
            // City Admin sees all (no extra filter needed) if no specific city assigned
        }

        if (role === 'citizen') {
            // query = query.orderBy('createdAt', 'desc'); // Removed to avoid index error
        }

        if (limit) query = query.limit(Number(limit));

        const snapshot = await query.get();
        let complaints = snapshot.docs.map(doc => {
            const data = doc.data();
            // Active Escalation Check (48h)
            let isOverdue = data.isOverdue || false;
            let escalationTriggered = data.escalationTriggered || false;

            if (!isOverdue && ['submitted', 'in_progress', 'reopened'].includes(data.status)) {
                const createdAt = data.createdAt?.toDate();
                if (createdAt) {
                    const diffHours = (new Date().getTime() - createdAt.getTime()) / (1000 * 60 * 60);
                    if (diffHours > 48) {
                        isOverdue = true;
                        // Note: Actual escalation is handled by the cron job (src/cron/escalationJob.ts)
                        // We just flag it here for UI display if the cron hasn't run yet.
                    }
                }
            }
            return { id: doc.id, ...data, isOverdue, escalationTriggered };
        });

        // Global In-Memory Sort (since we removed orderBy from query)
        complaints.sort((a: any, b: any) => {
            const dateA = a.createdAt ? new Date(a.createdAt._seconds * 1000).getTime() : 0;
            const dateB = b.createdAt ? new Date(b.createdAt._seconds * 1000).getTime() : 0;
            return dateB - dateA; // Descending
        });

        res.json(complaints);
    } catch (error: any) {
        console.error("Error fetching complaints (MESSAGE):", error.message);
        if (error.details) console.error("Error Details:", error.details);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

export const updateComplaint = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        const { actorId } = req.body; // Expecting actorId in body for now

        if (!actorId) return res.status(400).json({ error: "Actor ID required" });

        const { role } = await getCurrentUserRole(actorId);

        if (role !== 'admin') {
            return res.status(403).json({ error: "Only admins can update complaint details" });
        }

        // Remove actor info
        delete updates.actorId;
        delete updates.actorRole;

        const docRef = db.collection('complaints').doc(id);
        const docSnap = await docRef.get();

        if (!docSnap.exists) {
            return res.status(404).json({ error: "Complaint not found" });
        }

        // Allowed status transitions for Admin:
        // submitted -> in_progress
        // reopened -> in_progress
        // in_progress -> resolved (handled by resolveComplaint, but technically update can do it too if no proof needed, but we enforce proof)

        if (updates.status) {
            const currentStatus = docSnap.data()?.status;
            if (updates.status === 'in_progress') {
                if (!['submitted', 'reopened'].includes(currentStatus)) {
                    return res.status(400).json({ error: `Cannot transition from ${currentStatus} to in_progress` });
                }
            }
            // Allow rejection from submitted/in_progress/reopened
            if (updates.status === 'rejected') {
                if (!['submitted', 'in_progress', 'reopened'].includes(currentStatus)) {
                    return res.status(400).json({ error: `Cannot reject a complaint that is already ${currentStatus}` });
                }
                if (!updates.rejectionReason) {
                    return res.status(400).json({ error: "Rejection reason is required" });
                }
            }

            // If trying to set resolved here without proof, warn or allow? 
            // Let's enforce use of /resolve endpoint for resolution to capture proof.
            if (updates.status === 'resolved') {
                return res.status(400).json({ error: "Use /resolve endpoint to mark as resolved with proof" });
            }
        }

        await docRef.update({
            ...updates,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        await logActivity(id, 'admin_updated', actorId, 'admin', {
            updates: Object.keys(updates)
        });

        res.json({ message: "Complaint updated successfully" });
    } catch (error) {
        console.error("Error updating complaint:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

export const resolveComplaint = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { actorId, proof, adminLocation } = req.body; // proof: { imageUrl, note }, adminLocation: { lat, lng }
        console.log("resolveComplaint called with:", { actorId, proof, adminLocation });

        if (!actorId) return res.status(400).json({ error: "Actor ID required" });
        const { role } = await getCurrentUserRole(actorId);

        if (role !== 'admin') {
            return res.status(403).json({ error: "Only admins can resolve complaints" });
        }

        if (!proof || (!proof.imageUrl && !proof.webViewLink)) {
            return res.status(400).json({ error: "Resolution proof with image is required" });
        }

        const docRef = db.collection('complaints').doc(id);
        const docSnap = await docRef.get();

        if (!docSnap.exists) return res.status(404).json({ error: "Complaint not found" });

        const currentStatus = docSnap.data()?.status;
        if (!['submitted', 'in_progress', 'reopened'].includes(currentStatus)) {
            return res.status(400).json({ error: `Complaint must be open to resolve (current: ${currentStatus})` });
        }

        // Optional: AI Check (keep existing logic if desired, but simplified here)
        // We will just save the proof and set status to resolved.

        // GPS Mismatch Check
        let proofLocationMismatch = false;
        let proofLocationDistance = 0;

        if (adminLocation && adminLocation.lat && adminLocation.lng) {
            const complaintLoc = docSnap.data()?.location;
            if (complaintLoc && complaintLoc.lat && complaintLoc.lng) {
                const dist = calculateDistance(adminLocation.lat, adminLocation.lng, complaintLoc.lat, complaintLoc.lng);

                // DEMO MODE: Allow larger radius if enabled
                const maxDistance = process.env.DEMO_MODE === 'true' ? 5000 : 200;

                if (dist > maxDistance) {
                    // STRICT BLOCKING: Anti-Corruption Measure
                    return res.status(400).json({
                        error: `GPS Mismatch! You are ${Math.round(dist)}m away. Limit is ${maxDistance}m.`
                    });
                }
            }
        }

        await docRef.update({
            status: 'resolved',
            resolutionProof: {
                ...proof,
                proofLocationMismatch: false, // Always false if we passed the check
                proofLocationDistance: 0
            },
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            resolverId: actorId
        });

        await logActivity(id, 'admin_resolved', actorId, 'admin', {
            proofProvided: true
        }, proof.note);

        // Notify User
        const userPhone = await getUserPhone(docSnap.data()?.userId);
        if (userPhone) {
            // Fetch user locale
            const userDoc = await db.collection('users').doc(docSnap.data()?.userId).get();
            const userLocale = userDoc.data()?.locale || 'en';

            await sendLocalizedWhatsAppMessage(
                userPhone,
                'whatsapp.status_update',
                { id, status: 'resolved' },
                userLocale
            );
        }

        res.json({ message: "Complaint resolved successfully" });
    } catch (error: any) {
        console.error("Error resolving complaint:", error);
        res.status(500).json({ error: error.message || "Internal Server Error" });
    }
};

export const reopenComplaint = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { actorId, reason } = req.body;

        if (!actorId) return res.status(400).json({ error: "Actor ID required" });
        const { role, uid } = await getCurrentUserRole(actorId);

        if (role !== 'citizen') {
            return res.status(403).json({ error: "Only citizens can reopen complaints" });
        }

        const docRef = db.collection('complaints').doc(id);
        const docSnap = await docRef.get();

        if (!docSnap.exists) return res.status(404).json({ error: "Complaint not found" });

        const data = docSnap.data();
        if (data?.userId !== uid) {
            return res.status(403).json({ error: "You can only reopen your own complaints" });
        }

        if (data?.status !== 'resolved') {
            return res.status(400).json({ error: "Only resolved complaints can be reopened" });
        }

        await docRef.update({
            status: 'reopened',
            timesReopened: admin.firestore.FieldValue.increment(1),
            reopenReason: reason,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        await logActivity(id, 'citizen_reopened', actorId, 'citizen', {
            reason
        }, reason);

        res.json({ message: "Complaint reopened successfully" });
    } catch (error) {
        console.error("Error reopening complaint:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

export const rejectComplaint = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { actorId, reason } = req.body;

        if (!actorId) return res.status(400).json({ error: "Actor ID required" });
        if (!reason) return res.status(400).json({ error: "Rejection reason is required" });

        const { role } = await getCurrentUserRole(actorId);

        if (role !== 'admin') {
            return res.status(403).json({ error: "Only admins can reject complaints" });
        }

        const docRef = db.collection('complaints').doc(id);
        const docSnap = await docRef.get();

        if (!docSnap.exists) return res.status(404).json({ error: "Complaint not found" });

        const currentStatus = docSnap.data()?.status;
        if (currentStatus === 'resolved' || currentStatus === 'rejected') {
            return res.status(400).json({ error: `Cannot reject a ${currentStatus} complaint` });
        }

        await docRef.update({
            status: 'rejected',
            rejectionReason: reason,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            resolverId: actorId
        });

        await logActivity(id, 'admin_resolved', actorId, 'admin', {
            action: 'rejected',
            reason
        }, `Rejected: ${reason}`);

        // Notify User
        const userPhone = await getUserPhone(docSnap.data()?.userId);
        if (userPhone) {
            // Fetch user locale
            const userDoc = await db.collection('users').doc(docSnap.data()?.userId).get();
            const userLocale = userDoc.data()?.locale || 'en';

            await sendLocalizedWhatsAppMessage(
                userPhone,
                'whatsapp.status_update',
                { id, status: 'rejected' },
                userLocale
            );
        }

        res.json({ message: "Complaint rejected successfully" });
    } catch (error) {
        console.error("Error rejecting complaint:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

// Deprecated or Unused in Simplified Workflow
export const verifyComplaint = async (req: Request, res: Response) => {
    res.status(410).json({ error: "This endpoint is deprecated in the simplified workflow." });
};

export const voteDispute = async (req: Request, res: Response) => {
    res.status(410).json({ error: "This endpoint is deprecated in the simplified workflow." });
};

export const uploadCitizenProof = async (req: Request, res: Response) => {
    res.status(410).json({ error: "This endpoint is deprecated in the simplified workflow." });
};

export const voteResolution = async (req: Request, res: Response) => {
    res.status(410).json({ error: "This endpoint is deprecated in the simplified workflow." });
};

export const getComplaintTimeline = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const snapshot = await db.collection(`complaints/${id}/complaintActivity`)
            .orderBy('timestamp', 'asc')
            .get();

        const activities = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.json(activities);
    } catch (error) {
        console.error("Error fetching timeline:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

export const getPublicStats = async (req: Request, res: Response) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const complaintsRef = db.collection('complaints');

        const [totalSnap, resolvedSnap, todaySnap] = await Promise.all([
            complaintsRef.count().get(),
            complaintsRef.where('status', '==', 'resolved').count().get(),
            complaintsRef.where('createdAt', '>=', today).count().get()
        ]);

        res.json({
            total_complaints_today: todaySnap.data().count,
            complaints_solved: resolvedSnap.data().count,
            average_resolution_time: "24h",
            common_categories: ["Roads", "Waste", "Water"]
        });
    } catch (error) {
        console.error("Error fetching public stats:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

export const getAdminStats = async (req: Request, res: Response) => {
    try {
        // @ts-ignore
        const uid = req.user?.uid || req.headers['x-user-id'] || req.query.userId;
        if (!uid) return res.status(401).json({ error: "Unauthorized" });

        const { role, adminLevel, assignedWard, assignedCity } = await getCurrentUserRole(uid);

        if (role !== 'admin') {
            return res.status(403).json({ error: "Access Denied" });
        }

        let baseQuery: admin.firestore.Query = db.collection('complaints');

        // Apply Role Filters (Same logic as getComplaints)
        if (adminLevel === 'ward' && assignedWard) {
            baseQuery = baseQuery.where('location.wardCode', '==', assignedWard);
        } else if (adminLevel === 'city' && assignedCity) {
            if (assignedCity === 'Delhi') {
                baseQuery = baseQuery.where('location.stateName', '==', 'NCTofDelhi');
            } else if (assignedCity === 'Mumbai') {
                baseQuery = baseQuery.where('location.districtName', 'in', ['Mumbai City', 'MumbaiSuburban']);
            } else {
                baseQuery = baseQuery.where('location.districtName', '==', assignedCity);
            }
        }

        // Execute parallel count queries
        const [totalSnap, pendingSnap, criticalSnap, resolvedSnap] = await Promise.all([
            baseQuery.count().get(),
            baseQuery.where('status', 'in', ['submitted', 'in_progress', 'reopened']).count().get(),
            baseQuery.where('priority', '==', 'high').where('status', 'in', ['submitted', 'in_progress', 'reopened']).count().get(),
            baseQuery.where('status', '==', 'resolved').count().get()
        ]);

        res.json({
            total: totalSnap.data().count,
            pending: pendingSnap.data().count,
            critical: criticalSnap.data().count,
            resolved: resolvedSnap.data().count
        });

    } catch (error) {
        console.error("Error fetching admin stats:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

export const getEscalatedComplaints = async (req: Request, res: Response) => {
    try {
        // @ts-ignore
        const uid = req.user?.uid || req.headers['x-user-id'] || req.query.userId;
        if (!uid) return res.status(401).json({ error: "Unauthorized" });

        const { role, adminLevel } = await getCurrentUserRole(uid);

        if (role !== 'admin' || adminLevel !== 'city') {
            return res.status(403).json({ error: "Access Denied: City Admin only" });
        }

        const snapshot = await db.collection('complaints')
            .where('escalationTriggered', '==', true)
            .orderBy('escalatedAt', 'desc')
            .limit(50)
            .get();

        const complaints = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.json(complaints);
    } catch (error) {
        console.error("Error fetching escalated complaints:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

export const getPublicFeed = async (req: Request, res: Response) => {
    try {
        const snapshot = await db.collection('complaints')
            .orderBy('updatedAt', 'desc')
            .limit(20)
            .get();

        const feed = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                title: data.title,
                category: data.category,
                status: data.status,
                priority: data.priority,
                district: data.location?.districtName || 'Unknown',
                ward: data.location?.wardCode || 'Unknown',
                timestamp: data.updatedAt,
                // Generate a fake "hash" for the audit log vibe
                hash: Buffer.from(doc.id + data.updatedAt?.toMillis()).toString('hex').substring(0, 16)
            };
        });

        res.json(feed);
    } catch (error) {
        console.error("Error fetching public feed:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

export const transcribeComplaint = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        // @ts-ignore
        const uid = req.user?.uid || req.headers['x-user-id'];

        if (!uid) return res.status(401).json({ error: "Unauthorized" });

        // Check permissions (Admin or System)
        const { role } = await getCurrentUserRole(uid);
        if (role !== 'admin') {
            return res.status(403).json({ error: "Only admins can request transcription" });
        }

        const docRef = db.collection('complaints').doc(id);
        const docSnap = await docRef.get();

        if (!docSnap.exists) {
            return res.status(404).json({ error: "Complaint not found" });
        }

        const data = docSnap.data();

        // 1. Identify Audio Source
        let audioUrl = data?.recordingUrl;

        // Check attachments if no direct recordingUrl
        if (!audioUrl && data?.attachments && data.attachments.length > 0) {
            const audioAttachment = data.attachments.find((att: any) =>
                att.type === 'audio' ||
                att.name.endsWith('.mp3') ||
                att.name.endsWith('.wav') ||
                att.name.endsWith('.m4a') ||
                att.name.endsWith('.ogg')
            );
            if (audioAttachment) {
                audioUrl = audioAttachment.url || audioAttachment.webViewLink;
            }
        }

        if (!audioUrl) {
            return res.status(400).json({ error: "No audio recording found for this complaint" });
        }

        // 2. Update Status to Pending
        await docRef.update({
            transcriptionStatus: 'pending',
            transcriptionRequestedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // 3. Call Deepgram (Sync for Demo)
        console.log(`Starting transcription for ${id} with URL: ${audioUrl}`);

        const { result, error } = await deepgram.listen.prerecorded.transcribeUrl(
            { url: audioUrl },
            {
                model: 'nova-3',
                smart_format: true,
                language: process.env.DEEPGRAM_DEFAULT_LANGUAGE || 'en',
            }
        );

        if (error) {
            console.error("Deepgram Error:", error);
            await docRef.update({
                transcriptionStatus: 'failed',
                transcriptionError: error.message || "Unknown Deepgram error"
            });
            return res.status(500).json({ error: "Transcription failed", details: error });
        }

        // 4. Process Result
        const transcript = result.results?.channels[0]?.alternatives[0]?.transcript;

        if (!transcript) {
            await docRef.update({
                transcriptionStatus: 'completed', // Completed but empty? or failed?
                transcript: "[No speech detected]",
                transcriptionCompletedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            return res.json({ message: "Transcription completed (no speech detected)", transcript: "" });
        }

        await docRef.update({
            transcriptionStatus: 'completed',
            transcript: transcript,
            transcriptionCompletedAt: admin.firestore.FieldValue.serverTimestamp(),
            transcriptionProvider: 'deepgram',
            transcriptionModel: 'nova-3'
        });

        await logActivity(id, 'admin_updated', uid, 'admin', {
            action: 'transcribed',
            provider: 'deepgram'
        }, "Audio transcribed successfully");

        res.json({ message: "Transcription successful", transcript });

    } catch (error: any) {
        console.error("Error in transcribeComplaint:", error);
        res.status(500).json({ error: "Internal Server Error", details: error.message });
    }
};

export const transcribeAudio = async (req: Request, res: Response) => {
    try {
        console.log("🎤 transcribeAudio called");
        const file = (req as any).file;
        console.log("📂 File object:", file ? "Found" : "Missing");
        if (!file) {
            return res.status(400).json({ error: "No audio file uploaded" });
        }

        const audioBuffer = file.buffer;
        const mimetype = file.mimetype;

        console.log(`Starting direct audio transcription. Size: ${audioBuffer.length}, Type: ${mimetype}`);

        const { result, error } = await deepgram.listen.prerecorded.transcribeFile(
            audioBuffer,
            {
                model: 'nova-3',
                smart_format: true,
                language: process.env.DEEPGRAM_DEFAULT_LANGUAGE || 'en',
                mimetype: mimetype,
            }
        );

        if (error) {
            console.error("Deepgram API Error:", error);
            return res.status(500).json({ error: "Transcription failed", details: error });
        }

        const transcript = result.results?.channels[0]?.alternatives[0]?.transcript;

        res.json({
            transcript: transcript || "",
            confidence: result.results?.channels[0]?.alternatives[0]?.confidence
        });

    } catch (error: any) {
        console.error("Error in transcribeAudio:", error);
        res.status(500).json({ error: "Internal Server Error", details: error.message });
    }
};


export { logActivity };
