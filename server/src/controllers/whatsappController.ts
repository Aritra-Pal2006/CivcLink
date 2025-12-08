import { Request, Response } from 'express';
import * as admin from 'firebase-admin';
import axios from 'axios';
import twilio from 'twilio';
import { lookupAdminArea } from '../utils/geoTagger';
import { logActivity } from './complaintController';
import { sendWhatsAppMessage } from '../services/whatsappService';

const db = admin.firestore();

export const handleIncomingWebhook = async (req: Request, res: Response) => {
    console.log("📥 Webhook HIT! From:", req.body.From, "Body:", req.body.Body);

    // 1. Feature Toggle
    if (process.env.ENABLE_WHATSAPP_INTAKE !== 'true') {
        const twiml = new twilio.twiml.MessagingResponse();
        twiml.message("CivicLink WhatsApp intake is currently disabled.");
        res.type('text/xml').send(twiml.toString());
        return;
    }

    const params = req.body;
    const from = params.From; // whatsapp:+91...
    const body = params.Body ? params.Body.trim() : '';
    const lat = params.Latitude;
    const lng = params.Longitude;

    if (!from) {
        res.status(400).send("Missing From");
        return;
    }

    const phoneNumber = from.replace('whatsapp:', '');

    try {
        // 2. Get or Create Session
        const sessionRef = db.collection('whatsapp_sessions').doc(phoneNumber);
        const sessionDoc = await sessionRef.get();
        let session = sessionDoc.exists ? sessionDoc.data() : { step: 'START', tempData: {} };

        // 3. State Machine
        let replyMsg = "";
        let nextStep = session?.step;
        let tempData = session?.tempData || {};

        // Handle "Reset" or "Cancel" command at any time
        if (body.toLowerCase() === 'reset' || body.toLowerCase() === 'cancel') {
            await sessionRef.delete();
            await sendWhatsAppMessage(from, "❌ Complaint filing cancelled. Send any message to start again.");
            res.status(200).send("");
            return;
        }

        switch (session?.step) {
            case 'START':
            default:
                // User initiated conversation
                replyMsg = "👋 Welcome to CivicLink!\n\nLet's file a complaint. First, please enter a short *Title* for the issue (e.g., 'Broken Streetlight').";
                nextStep = 'AWAITING_TITLE';
                break;

            case 'AWAITING_TITLE':
                if (!body) {
                    replyMsg = "Please enter a valid text title.";
                } else {
                    tempData.title = body;
                    replyMsg = "Got it. Now, please describe the issue in *Detail*.";
                    nextStep = 'AWAITING_DESCRIPTION';
                }
                break;

            case 'AWAITING_DESCRIPTION':
                if (!body) {
                    replyMsg = "Please enter a valid description.";
                } else {
                    tempData.description = body;
                    replyMsg = "Thanks. Finally, please share the *Location* of the issue.\n\n📎 Tap the Paperclip/Plus icon -> Location -> Send Your Current Location.";
                    nextStep = 'AWAITING_LOCATION';
                }
                break;

            case 'AWAITING_LOCATION':
                if (lat && lng) {
                    // WE HAVE EVERYTHING! CREATE COMPLAINT
                    await createComplaintFromSession(phoneNumber, tempData, lat, lng);
                    replyMsg = ""; // createComplaintFromSession sends the final reply
                    await sessionRef.delete(); // Clear session
                    nextStep = 'START'; // Reset local var just in case
                } else {
                    replyMsg = "📍 Please share the *Location* using the attachment menu to complete the complaint.";
                }
                break;
        }

        // 4. Update Session & Reply
        if (nextStep !== 'START') {
            // If document doesn't exist or step changed, set/update
            if (!sessionDoc.exists || nextStep !== session?.step) {
                await sessionRef.set({
                    step: nextStep,
                    tempData: tempData,
                    lastUpdated: admin.firestore.FieldValue.serverTimestamp()
                });
            } else {
                // Just update timestamp
                await sessionRef.update({
                    lastUpdated: admin.firestore.FieldValue.serverTimestamp()
                });
            }
        }

        if (replyMsg) {
            await sendWhatsAppMessage(from, replyMsg);
        }

        res.status(200).send("");

    } catch (error) {
        console.error("Error processing WhatsApp webhook:", error);
        res.status(200).send("");
    }
};

// Helper function to create the actual complaint
const createComplaintFromSession = async (phoneNumber: string, data: any, lat: string, lng: string) => {
    const from = `whatsapp:${phoneNumber}`;

    // 1. Map User
    let userId: string;
    try {
        const userRecord = await admin.auth().getUserByPhoneNumber(phoneNumber);
        userId = userRecord.uid;
    } catch (error: any) {
        if (error.code === 'auth/user-not-found') {
            const newUser = await admin.auth().createUser({
                phoneNumber: phoneNumber,
                displayName: `WhatsApp User ${phoneNumber.slice(-4)}`
            });
            userId = newUser.uid;
            await db.collection('users').doc(userId).set({
                phoneNumber,
                role: 'citizen',
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            });
        } else {
            throw error;
        }
    }

    // 2. AI Classification (on the Description)
    let category = 'General';
    let priority = 'medium';
    let summary = '';

    if (process.env.AI_API_KEY && process.env.AI_API_BASE_URL) {
        try {
            const apiKey = process.env.AI_API_KEY;
            const apiBaseUrl = process.env.AI_API_BASE_URL;
            const prompt = `
            Analyze:
            Title: ${data.title}
            Description: ${data.description}
            
            Provide JSON: { category, priority, summary }
            Categories: Roads, Electricity, Water, Waste, Public Safety, General
            `;

            const aiResponse = await axios.post(
                `${apiBaseUrl}?key=${apiKey}`,
                { contents: [{ parts: [{ text: prompt }] }] },
                { timeout: 10000 }
            );
            const text = aiResponse.data.candidates[0].content.parts[0].text;
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const result = JSON.parse(jsonMatch[0]);
                category = result.category || 'General';
                priority = result.priority || 'medium';
                summary = result.summary || '';
            }
        } catch (e) {
            console.warn("AI failed", e);
        }
    }

    // 3. Location
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    let locationData = {
        lat: latitude,
        lng: longitude,
        address: "Pinned from WhatsApp"
    };
    const area = lookupAdminArea(latitude, longitude);
    // @ts-ignore
    locationData = { ...locationData, ...area };

    // 4. Save
    const docRef = await db.collection('complaints').add({
        userId,
        title: data.title,
        description: data.description,
        category,
        priority,
        location: locationData,
        status: 'submitted',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        source: 'whatsapp',
        aiSummary: summary,
        attachments: [],
        upvotes: 0,
        upvotedBy: [],
        timesReopened: 0,
        isEscalated: false
    });

    // 5. Log
    await logActivity(docRef.id, 'created', userId, 'citizen', {
        initialStatus: 'submitted',
        source: 'whatsapp',
        aiCategorized: category !== 'General'
    });

    // 6. Final Reply
    const finalMsg = `✅ *Complaint Registered!*\n\n🆔 ID: ${docRef.id}\n📂 Category: ${category}\n🚦 Priority: ${priority}\n\nWe will notify you of updates.`;
    await sendWhatsAppMessage(from, finalMsg);
};
