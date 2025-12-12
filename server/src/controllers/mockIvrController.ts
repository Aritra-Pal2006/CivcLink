import { Request, Response } from 'express';
import * as admin from 'firebase-admin';
import { sendWhatsAppMessage } from '../services/whatsappService';

const db = admin.firestore();

// Mock Twilio TwiML Response Helper
const twimlResponse = (content: any) => {
    return {
        _mock_twiml: true,
        ...content
    };
};

export const handleMockIvrWebhook = async (req: Request, res: Response) => {
    try {
        const { CallSid, From, Digits, RecordingUrl, RecordingDuration } = req.body;

        console.log(`📞 Mock IVR Webhook: ${CallSid} | From: ${From} | Digits: ${Digits} | Rec: ${RecordingUrl}`);

        // Log the call step
        await db.collection('mockIvrCalls').doc(CallSid).set({
            from: From,
            lastUpdate: admin.firestore.FieldValue.serverTimestamp(),
            steps: admin.firestore.FieldValue.arrayUnion({
                timestamp: new Date().toISOString(),
                payload: req.body
            })
        }, { merge: true });

        // 1. Initial Call / Menu
        if (!Digits && !RecordingUrl) {
            return res.json(twimlResponse({
                say: "Welcome to CivicLink. Press 1 to report a complaint. Press 2 for status.",
                gather: {
                    numDigits: 1,
                    action: "/api/mock-ivr/webhook"
                }
            }));
        }

        // 2. Handle Menu Selection
        if (Digits === '1') {
            return res.json(twimlResponse({
                say: "Please record your complaint after the beep. Press # when finished.",
                record: {
                    action: "/api/mock-ivr/webhook",
                    maxLength: 60,
                    finishOnKey: "#"
                }
            }));
        }

        if (Digits === '2') {
            return res.json(twimlResponse({
                say: "Please check your WhatsApp for status updates. Goodbye.",
                hangup: true
            }));
        }

        // 3. Handle Recording (Complaint Creation)
        if (RecordingUrl) {
            console.log("🎙️ Processing Recording:", RecordingUrl);

            // Create Complaint
            // We need to map phone number to a user ID or create a temp one
            let userId = 'mock-ivr-user';
            const userSnapshot = await db.collection('users').where('phoneNumber', '==', From).limit(1).get();

            if (!userSnapshot.empty) {
                userId = userSnapshot.docs[0].id;
            } else {
                // Create a temp user if not exists (optional, or just use a generic IVR user)
                // For demo, let's try to find or create
                const newUserRef = db.collection('users').doc();
                await newUserRef.set({
                    phoneNumber: From,
                    role: 'citizen',
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    isAnonymous: true
                });
                userId = newUserRef.id;
            }

            // Mock Request for createComplaint
            // We'll call the logic directly or simulate it. 
            // Reusing createComplaint controller might be tricky due to req/res structure.
            // Let's implement a simplified creation here reusing the core logic if possible, 
            // or just inserting directly to ensure it works exactly as expected.

            // Actually, let's do it properly by inserting into DB to match exactly what createComplaint does.
            const complaintRef = db.collection('complaints').doc();
            const ticketId = `CIV-${complaintRef.id.slice(-5).toUpperCase()}`;

            const complaintData = {
                userId,
                title: "Voice Complaint (IVR)",
                description: `Received via Mock IVR. Duration: ${RecordingDuration}s.`,
                category: "General", // Default
                urgency: "medium",
                status: "submitted",
                location: {
                    // Default to a central location or null if we can't get it
                    // For IVR, we often don't have location unless they enter pincode.
                    // Let's put a placeholder or 0,0
                    lat: 19.0760,
                    lng: 72.8777,
                    address: "Recorded via IVR"
                },
                images: [],
                recordings: [RecordingUrl], // The important part
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                ticketId,
                channel: 'ivr-mock',
                source: 'phone'
            };

            await complaintRef.set(complaintData);

            // Log result
            await db.collection('mockIvrCalls').doc(CallSid).set({
                complaintId: complaintRef.id,
                ticketId: ticketId,
                status: 'COMPLAINT_CREATED'
            }, { merge: true });

            // Send Confirmation
            try {
                // We can reuse the WhatsApp service if they have WhatsApp
                await sendWhatsAppMessage(`whatsapp:${From}`, `✅ Complaint Registered via Call!\nTicket ID: *${ticketId}*`);
            } catch (e) {
                console.warn("Could not send WhatsApp confirmation for IVR complaint", e);
            }

            return res.json(twimlResponse({
                say: `Thank you. Your complaint has been registered. Your Ticket ID is ${ticketId.split('').join(' ')}. Goodbye.`,
                hangup: true
            }));
        }

        // Fallback
        return res.json(twimlResponse({
            say: "Invalid input. Goodbye.",
            hangup: true
        }));

    } catch (error) {
        console.error("Mock IVR Error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};
