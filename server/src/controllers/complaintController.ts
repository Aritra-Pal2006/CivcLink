import { Request, Response } from 'express';
import * as admin from 'firebase-admin';
import { lookupAdminArea } from '../utils/geoTagger';
import { getImageHash } from '../utils/imageUtils';
import { aiManager } from '../services/ai/aiManager';

const db = admin.firestore();

// Helper to log activity
const logActivity = async (
    complaintId: string,
    type: 'created' | 'ai_analyzed' | 'admin_updated' | 'admin_resolved' | 'citizen_verified' | 'citizen_reopened',
    actorId: string,
    actorRole: 'citizen' | 'official' | 'superadmin' | 'system',
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

export const createComplaint = async (req: Request, res: Response) => {
    try {
        const { userId, title, description, category, location, priority, attachments } = req.body;

        if (!userId || !title || !description || !location) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        // Auto-tag State/District
        let adminArea = { stateName: null, stateCode: null, districtName: null, districtCode: null };
        if (location && location.lat && location.lng) {
            const area = lookupAdminArea(location.lat, location.lng);
            // @ts-ignore
            adminArea = area;
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
            attachments: attachments || [],
            upvotes: 0,
            upvotedBy: []
        };

        const docRef = await db.collection('complaints').add(complaintData);

        // Log 'created' activity
        await logActivity(docRef.id, 'created', userId, 'citizen', {
            initialStatus: 'submitted',
            locationTagged: !!adminArea.districtName
        });

        res.status(201).json({ id: docRef.id, message: "Complaint created successfully" });
    } catch (error) {
        console.error("Error creating complaint:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

export const updateComplaint = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        const { actorId, actorRole } = req.body;

        if (!actorId || !actorRole) {
            // In a real app, we'd get this from the auth token. 
        }

        // Remove actor info from updates object so we don't save it to the doc
        delete updates.actorId;
        delete updates.actorRole;

        const docRef = db.collection('complaints').doc(id);
        const docSnap = await docRef.get();

        if (!docSnap.exists) {
            return res.status(404).json({ error: "Complaint not found" });
        }

        const currentData = docSnap.data();

        // If location is being updated, re-tag
        if (updates.location && updates.location.lat && updates.location.lng) {
            // Check if lat/lng actually changed to avoid redundant calculation
            if (currentData?.location?.lat !== updates.location.lat || currentData?.location?.lng !== updates.location.lng) {
                const area = lookupAdminArea(updates.location.lat, updates.location.lng);
                updates.location = {
                    ...updates.location,
                    ...area
                };
            }
        } else if (updates.location && currentData?.location) {
            // If location update is partial (e.g. just address), preserve existing tags or re-tag if lat/lng exists in currentData
            // Simplest: If lat/lng provided in update, re-tag. If not, assume no change to lat/lng.
            // If user updates ONLY address, we keep old lat/lng and tags.
            // If user updates lat/lng, we re-tag.
            // The logic above handles explicit lat/lng update.
        }

        await docRef.update({
            ...updates,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // Log 'admin_updated'
        await logActivity(id, 'admin_updated', actorId || 'unknown', actorRole || 'official', {
            updates: Object.keys(updates)
        });

        res.json({ message: "Complaint updated successfully" });
    } catch (error) {
        console.error("Error updating complaint:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

import { sendWhatsAppMessage } from '../services/whatsappService';

// Helper to get user phone
const getUserPhone = async (userId: string): Promise<string | null> => {
    try {
        const userDoc = await db.collection('users').doc(userId).get();
        if (userDoc.exists) {
            return userDoc.data()?.phoneNumber || null;
        }
        // Fallback to Auth? Admin SDK can get user by UID
        const userRecord = await admin.auth().getUser(userId);
        return userRecord.phoneNumber || null;
    } catch (error) {
        console.error("Error fetching user phone:", error);
        return null;
    }
};

export const resolveComplaint = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { actorId, proof } = req.body; // proof object: { imageUrl, note }

        if (!proof || !proof.imageUrl) {
            return res.status(400).json({ error: "Resolution proof with image is required" });
        }

        const docRef = db.collection('complaints').doc(id);
        const docSnap = await docRef.get();
        const complaintData = docSnap.data();

        if (!complaintData) return res.status(404).json({ error: "Complaint not found" });

        // 1. Check Admin Trust Score
        let trustScore = 100;
        const adminRef = db.collection('users').doc(actorId);
        const adminSnap = await adminRef.get();
        if (adminSnap.exists) {
            trustScore = adminSnap.data()?.trustScore ?? 100;
        }

        // 2. Generate Image Hash & Check Duplicates
        const imageHash = await getImageHash(proof.imageUrl);

        // Check if this hash exists in any OTHER resolved complaint
        const duplicateQuery = await db.collection('complaints')
            .where('resolutionProof.imageHash', '==', imageHash)
            .limit(1)
            .get();

        let isDuplicate = false;
        if (!duplicateQuery.empty) {
            // Ensure it's not the same complaint (idempotency)
            if (duplicateQuery.docs[0].id !== id) {
                isDuplicate = true;
            }
        }

        if (isDuplicate) {
            // Penalize Admin
            await adminRef.update({
                trustScore: admin.firestore.FieldValue.increment(-20)
            });

            await docRef.update({
                status: 'flagged_duplicate',
                'resolutionProof.imageHash': imageHash,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });

            await logActivity(id, 'admin_resolved', actorId, 'official', {
                status: 'flagged_duplicate',
                reason: 'Duplicate resolution image detected'
            }, "System flagged duplicate image. Admin penalized.");

            return res.status(400).json({
                error: "Duplicate image detected. This image has been used in a previous resolution.",
                code: "DUPLICATE_IMAGE"
            });
        }

        // 3. AI Comparison
        const originalImage = complaintData.attachments && complaintData.attachments.length > 0
            ? complaintData.attachments[0].url
            : null;

        let aiVerification = {
            similarityScore: 0,
            verdict: 'UNCERTAIN',
            reason: 'No original image to compare'
        };

        if (originalImage) {
            aiVerification = await aiManager.compareImages(originalImage, proof.imageUrl);
        }

        // 4. Determine Status & Verification Flow
        let newStatus = 'pending_verification';
        let needsCommunityVote = false;

        // If Trust Score is low, force community vote
        if (trustScore < 50) {
            needsCommunityVote = true;
        }

        // If AI thinks it's fake or uncertain, force community vote
        if (aiVerification.verdict === 'LIKELY_FAKE' || aiVerification.verdict === 'UNCERTAIN') {
            needsCommunityVote = true;
        }

        // Update Complaint
        await docRef.update({
            status: newStatus,
            resolutionProof: {
                ...proof,
                imageHash
            },
            verification: {
                aiScore: aiVerification.similarityScore,
                aiVerdict: aiVerification.verdict,
                aiReason: aiVerification.reason,
                needsCommunityVote
            },
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            verificationDeadline: admin.firestore.Timestamp.fromMillis(Date.now() + 48 * 60 * 60 * 1000), // 48 hours
            resolverId: actorId // Store who resolved it for future penalties
        });

        // Log Activity
        await logActivity(id, 'admin_resolved', actorId, 'official', {
            newStatus,
            aiVerdict: aiVerification.verdict,
            trustScore,
            needsCommunityVote
        }, `Resolved. AI Verdict: ${aiVerification.verdict}. Community Vote Required: ${needsCommunityVote}`);

        // Notify User
        const userPhone = await getUserPhone(complaintData.userId);
        if (userPhone) {
            await sendWhatsAppMessage(userPhone, `Your complaint ${id} is resolved. Please verify in app.`);
        }

        res.json({
            message: "Complaint resolved",
            verification: aiVerification,
            needsCommunityVote
        });

    } catch (error: any) {
        console.error("Error resolving complaint:", error);
        res.status(500).json({ error: error.message || "Internal Server Error" });
    }
};

export const verifyComplaint = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { actorId } = req.body;

        const docRef = db.collection('complaints').doc(id);
        const docSnap = await docRef.get();
        const complaintData = docSnap.data();

        await docRef.update({
            status: 'resolved',
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        await logActivity(id, 'citizen_verified', actorId, 'citizen', {
            newStatus: 'resolved'
        });

        // Notify User (Confirmation)
        if (complaintData) {
            const userPhone = await getUserPhone(complaintData.userId);
            if (userPhone) {
                await sendWhatsAppMessage(userPhone, `Your complaint ${id} is confirmed resolved. Thank you for using CivicLink.`);
            }
        }

        res.json({ message: "Complaint verified and closed" });
    } catch (error) {
        console.error("Error verifying complaint:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

export const reopenComplaint = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { actorId, reason } = req.body;

        const docRef = db.collection('complaints').doc(id);
        const docSnap = await docRef.get();
        const complaintData = docSnap.data();
        const currentReopens = complaintData?.timesReopened || 0;

        await docRef.update({
            status: 'reopened',
            timesReopened: currentReopens + 1,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // Penalize Admin if they resolved it
        const resolverId = complaintData?.resolverId;
        if (resolverId) {
            // Check AI verdict to decide penalty severity?
            // If AI said LIKELY_FAKE and citizen rejects, heavy penalty (-10).
            // If AI said LIKELY_MATCH but citizen rejects, maybe lighter (-5) or none?
            // For now, let's apply a standard penalty for rejection (-10) to enforce quality.
            await db.collection('users').doc(resolverId).update({
                trustScore: admin.firestore.FieldValue.increment(-10)
            });
        }

        await logActivity(id, 'citizen_reopened', actorId, 'citizen', {
            newStatus: 'reopened',
            reason
        }, reason);

        // Notify User
        if (complaintData) {
            const userPhone = await getUserPhone(complaintData.userId);
            if (userPhone) {
                await sendWhatsAppMessage(userPhone, `Your complaint ${id} has been reopened and sent back to officials.`);
            }
        }

        res.json({ message: "Complaint reopened" });
    } catch (error) {
        console.error("Error reopening complaint:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
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

export const getComplaints = async (req: Request, res: Response) => {
    try {
        const { status, priority, requiresProof, limit, startAfter, state, district } = req.query;

        let query: admin.firestore.Query = db.collection('complaints');

        if (status) query = query.where('status', '==', status);
        if (priority) query = query.where('priority', '==', priority);
        if (state) query = query.where('location.stateName', '==', state);
        if (district) query = query.where('location.districtName', '==', district);
        if (req.query.needsCommunityVote === 'true') query = query.where('verification.needsCommunityVote', '==', true);

        query = query.orderBy('createdAt', 'desc');

        if (limit) query = query.limit(Number(limit));
        // Cursor pagination would require passing the actual document snapshot or a specific field value.
        // For simple implementation, we might skip cursor or use offset if collection is small.
        // Firestore doesn't support offset efficiently. 
        // Let's just return the list for now.

        const snapshot = await query.get();
        const complaints = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        res.json(complaints);
    } catch (error) {
        console.error("Error fetching complaints:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

// Export helper for use in AI controller
export { logActivity };

import { analyzeFraud } from '../services/aiService';

export const voteDispute = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { actorId } = req.body;

        const docRef = db.collection('complaints').doc(id);

        await db.runTransaction(async (t) => {
            const doc = await t.get(docRef);
            if (!doc.exists) throw new Error("Complaint not found");

            const data = doc.data();
            if (data?.status !== 'pending_verification' && data?.status !== 'resolved') {
                // Allow dispute on resolved ones too? Requirement says "pending_verification".
                // "After admin marks a complaint as “pending_verification”... Allow any logged-in citizen... to vote"
                if (data?.status !== 'pending_verification') {
                    throw new Error("Complaint is not in pending verification state");
                }
            }

            const currentVotes = data?.disputeVotes || 0;
            const newVotes = currentVotes + 1;

            const updates: any = {
                disputeVotes: newVotes,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            };

            if (newVotes > 3) {
                updates.status = 'flagged';
                // Notify superadmin logic here (mock)
                console.log(`[ALERT] Complaint ${id} flagged by community!`);
            }

            t.update(docRef, updates);
        });

        await logActivity(id, 'admin_updated', actorId, 'citizen', {
            action: 'vote_dispute'
        }, "Community dispute vote cast");

        res.json({ message: "Dispute vote recorded" });
    } catch (error: any) {
        console.error("Error voting dispute:", error);
        res.status(500).json({ error: error.message || "Internal Server Error" });
    }
};

export const uploadCitizenProof = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { citizen_proof_url, actorId } = req.body;

        if (!citizen_proof_url) {
            return res.status(400).json({ error: "Proof URL required" });
        }

        await db.collection('complaints').doc(id).update({
            citizen_proof_url,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        await logActivity(id, 'admin_updated', actorId, 'citizen', {
            action: 'upload_proof',
            url: citizen_proof_url
        }, "Citizen uploaded counter-proof");

        res.json({ message: "Citizen proof uploaded" });
    } catch (error) {
        console.error("Error uploading citizen proof:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

export const voteResolution = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { vote, actorId } = req.body; // "looks_fixed" or "not_fixed"

        if (!['looks_fixed', 'not_fixed'].includes(vote)) {
            return res.status(400).json({ error: "Invalid vote type" });
        }

        const docRef = db.collection('complaints').doc(id);

        await db.runTransaction(async (t) => {
            const doc = await t.get(docRef);
            if (!doc.exists) throw new Error("Complaint not found");

            const data = doc.data();
            const currentVotes = data?.communityVotes || { looks_fixed: 0, not_fixed: 0 };

            currentVotes[vote] = (currentVotes[vote] || 0) + 1;

            const updates: any = {
                communityVotes: currentVotes,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            };

            // Logic: 3+ Fake -> Reopen
            if (vote === 'not_fixed' && currentVotes['not_fixed'] >= 3) {
                updates.status = 'reopened';
                updates.timesReopened = (data?.timesReopened || 0) + 1;
                updates.reopenReason = "Community voted as Fake/Not Fixed";

                // Penalize Admin
                const resolverId = data?.resolverId;
                if (resolverId) {
                    const adminRef = db.collection('users').doc(resolverId);
                    // Use a transaction-safe update or just a regular update since we are inside a transaction 't'
                    // specific to the complaint. For the user doc, we should probably use the transaction too
                    // but we need to get the user doc ref first.
                    // To be safe and simple in this transaction block:
                    t.update(adminRef, {
                        trustScore: admin.firestore.FieldValue.increment(-10)
                    });
                }
            }

            // Logic: 3+ Legit -> Allow Citizen Verification
            if (vote === 'looks_fixed' && currentVotes['looks_fixed'] >= 3) {
                updates['verification.needsCommunityVote'] = false;
            }

            t.update(docRef, updates);
        });

        res.json({ message: "Vote recorded" });
    } catch (error) {
        console.error("Error voting on resolution:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

export const getPublicStats = async (req: Request, res: Response) => {
    try {
        // In a real high-scale app, we'd use aggregated counters.
        // For this hackathon/MVP, counting documents is okay-ish but slow.
        // Better: Maintain a 'stats' document that increments/decrements.
        // Fallback: Query snapshot size (expensive).

        // Let's try to get a stats doc if it exists, or calculate on fly.
        // For now, let's just do a simple count of recent complaints for "today"
        // and total count.

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const complaintsRef = db.collection('complaints');

        // Parallel queries
        const [totalSnap, resolvedSnap, todaySnap] = await Promise.all([
            complaintsRef.count().get(),
            complaintsRef.where('status', '==', 'resolved').count().get(),
            complaintsRef.where('createdAt', '>=', today).count().get()
        ]);

        // Mocking "common categories" and "avg resolution time" for performance
        // Real implementation would need aggregation pipelines or dedicated stats doc.

        res.json({
            total_complaints_today: todaySnap.data().count,
            complaints_solved: resolvedSnap.data().count,
            average_resolution_time: "24h", // Mock
            common_categories: ["Roads", "Waste", "Water"] // Mock
        });
    } catch (error) {
        console.error("Error fetching public stats:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};
