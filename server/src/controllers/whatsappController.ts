import { Request, Response } from 'express';
import * as admin from 'firebase-admin';
import axios from 'axios';
import twilio from 'twilio';
import { lookupAdminArea } from '../utils/geoTagger';
import { logActivity } from './complaintController';
import { sendWhatsAppMessage } from '../services/whatsappService';

const db = admin.firestore();

// --- Types & Interfaces ---
type BotState =
    | 'LANG_SELECT'
    | 'MENU'
    | 'NEW_COMPLAINT_TITLE'
    | 'NEW_COMPLAINT_DESC'
    | 'NEW_COMPLAINT_LOC'
    | 'NEW_COMPLAINT_MEDIA';

interface WhatsAppUser {
    phone: string;
    lang: 'en' | 'hi';
    state: BotState;
    tempData: any;
    lastActiveAt: admin.firestore.Timestamp;
    complaintCount1h: number;
    lastComplaintAt?: admin.firestore.Timestamp;
}

// --- Constants & Translations ---
const MESSAGES = {
    en: {
        welcome_lang: "Choose your language / भाषा चुनें:\n1️⃣ English\n2️⃣ हिंदी",
        welcome_menu: "Welcome to CivicLink 👋\nReply with:\n1️⃣ New Complaint\n2️⃣ My Complaints\n3️⃣ Help",
        help: "You can:\n- Create complaints via WhatsApp\n- Track complaint status (send 'status CIV-XXX')\n- Reopen unresolved issues\n- Use Hindi or English",
        ask_title: "Please enter a short *Title* for the issue (e.g., 'Broken Streetlight').",
        ask_desc: "Got it. Now, please describe the issue in *Detail*.",
        ask_loc: "Thanks. Finally, please share the *Location* of the issue.\n\n📎 Tap the Paperclip/Plus icon -> Location -> Send Your Current Location.",
        ask_media: "📸 Send a photo of the issue, or 🎙 send a voice note.\nReply 'skip' to continue.",
        complaint_created: "✅ Complaint Created!\nTicket ID: *{ticketId}*\nYou can check status anytime by sending:\nstatus {ticketId}",
        rate_limit: "⚠️ Too many complaints in a short time. Please try again later.",
        cancelled: "❌ Cancelled. Send 'hi' to start again.",
        invalid_input: "⚠️ Invalid input. Please try again.",
        status_response: "🧾 Ticket {ticketId}\nCategory: {category}\nStatus: {status}\nLast Updated: {timeAgo}",
        not_found: "❌ Complaint not found.",
        reopen_success: "⚠️ Complaint {ticketId} re-opened and sent back to officials.",
        reopen_fail: "❌ Could not reopen. Ensure ticket ID is correct and it is currently 'Resolved'.",
        my_complaints_empty: "You have no recent complaints.",
        my_complaints_header: "Here are your last 3 complaints:"
    },
    hi: {
        welcome_lang: "Choose your language / भाषा चुनें:\n1️⃣ English\n2️⃣ हिंदी",
        welcome_menu: "सिविकलिंक में आपका स्वागत है 👋\nउत्तर दें:\n1️⃣ नई शिकायत\n2️⃣ मेरी शिकायतें\n3️⃣ मदद",
        help: "आप WhatsApp से:\n- शिकायत दर्ज कर सकते हैं\n- स्थिति देख सकते हैं ('status CIV-XXX' भेजें)\n- दोबारा खोल सकते हैं\n- हिंदी या अंग्रेजी में उपयोग कर सकते हैं",
        ask_title: "कृपया समस्या का एक छोटा *शीर्षक* लिखें (जैसे, 'टूटी हुई स्ट्रीटलाइट').",
        ask_desc: "समझ गया। अब कृपया समस्या का *विस्तार* से वर्णन करें।",
        ask_loc: "धन्यवाद। अंत में, कृपया समस्या की *लोकेशन* साझा करें।\n\n📎 पेपरक्लिप/प्लस आइकन दबाएं -> लोकेशन -> अपनी वर्तमान लोकेशन भेजें।",
        ask_media: "📸 समस्या की फोटो भेजें या 🎙 आवाज़ में बताएं।\nआगे बढ़ने के लिए 'skip' लिखें।",
        complaint_created: "✅ आपकी शिकायत दर्ज हो गई है!\nटिकट ID: *{ticketId}*\nस्थिति जानने के लिए भेजें:\nstatus {ticketId}",
        rate_limit: "⚠️ थोड़े समय में बहुत अधिक शिकायतें दर्ज की गई हैं। कृपया बाद में प्रयास करें।",
        cancelled: "❌ रद्द किया गया। फिर से शुरू करने के लिए 'hi' भेजें।",
        invalid_input: "⚠️ अमान्य इनपुट। कृपया पुनः प्रयास करें।",
        status_response: "🧾 टिकट {ticketId}\nश्रेणी: {category}\nस्थिति: {status}\nअंतिम अपडेट: {timeAgo}",
        not_found: "❌ शिकायत नहीं मिली।",
        reopen_success: "⚠️ शिकायत {ticketId} फिर से खोल दी गई है।",
        reopen_fail: "❌ फिर से नहीं खोल सके। सुनिश्चित करें कि टिकट ID सही है और यह 'सुलझाई गई' है।",
        my_complaints_empty: "आपकी कोई हालिया शिकायत नहीं है।",
        my_complaints_header: "आपकी पिछली 3 शिकायतें:"
    }
};

// --- Helpers ---
const getMsg = (lang: 'en' | 'hi', key: keyof typeof MESSAGES['en'], params: Record<string, string> = {}) => {
    let msg = MESSAGES[lang][key] || MESSAGES['en'][key];
    for (const [k, v] of Object.entries(params)) {
        msg = msg.replace(`{${k}}`, v);
    }
    return msg;
};

const generateTicketId = (complaintId: string) => {
    return `CIV-${complaintId.slice(-5).toUpperCase()}`;
};

const getTimeAgo = (date: Date) => {
    const diff = (new Date().getTime() - date.getTime()) / 1000 / 60 / 60; // hours
    if (diff < 1) return "Just now";
    if (diff < 24) return `${Math.floor(diff)} hours ago`;
    return `${Math.floor(diff / 24)} days ago`;
};

// --- Main Webhook Handler ---
export const handleIncomingWebhook = async (req: Request, res: Response) => {
    console.log("📥 Webhook HIT! From:", req.body.From, "Body:", req.body.Body);

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
    const mediaUrl = params.MediaUrl0;
    const mediaType = params.MediaContentType0;

    if (!from) {
        res.status(400).send("Missing From");
        return;
    }

    const phoneNumber = from.replace('whatsapp:', '');

    try {
        // 1. Get User State
        const userRef = db.collection('whatsapp_users').doc(phoneNumber);
        const userDoc = await userRef.get();
        let user: WhatsAppUser = userDoc.exists ? userDoc.data() as WhatsAppUser : {
            phone: phoneNumber,
            lang: 'en', // Default temp
            state: 'LANG_SELECT',
            tempData: {},
            lastActiveAt: admin.firestore.Timestamp.now(),
            complaintCount1h: 0
        };

        // Reset rate limit if > 1 hour
        if (user.lastComplaintAt) {
            const hoursSinceLast = (Date.now() - user.lastComplaintAt.toDate().getTime()) / (1000 * 60 * 60);
            if (hoursSinceLast > 1) {
                user.complaintCount1h = 0;
            }
        }

        // 2. Global Commands
        const lowerBody = body.toLowerCase();

        // RESET
        if (lowerBody === 'reset' || lowerBody === 'cancel' || lowerBody === 'hi' || lowerBody === 'hello' || lowerBody === 'menu') {
            // If user exists and has lang, go to menu. Else lang select.
            if (userDoc.exists && user.lang) {
                user.state = 'MENU';
                user.tempData = {};
                await userRef.set(user);
                await sendWhatsAppMessage(from, getMsg(user.lang, 'welcome_menu'));
                res.status(200).send("");
                return;
            } else {
                user.state = 'LANG_SELECT';
                await userRef.set(user);
                await sendWhatsAppMessage(from, MESSAGES.en.welcome_lang);
                res.status(200).send("");
                return;
            }
        }

        // STATUS CHECK (status CIV-XXXX)
        if (lowerBody.startsWith('status civ-')) {
            const ticketId = body.split(' ')[1]?.toUpperCase() || body.toUpperCase();
            // Search by ticketId (we need to query)
            const snapshot = await db.collection('complaints').where('ticketId', '==', ticketId).limit(1).get();
            if (snapshot.empty) {
                await sendWhatsAppMessage(from, getMsg(user.lang, 'not_found'));
            } else {
                const data = snapshot.docs[0].data();
                await sendWhatsAppMessage(from, getMsg(user.lang, 'status_response', {
                    ticketId: data.ticketId,
                    category: data.category,
                    status: data.status,
                    timeAgo: getTimeAgo(data.updatedAt.toDate())
                }));
            }
            res.status(200).send("");
            return;
        }

        // REOPEN (reopen CIV-XXXX)
        if (lowerBody.startsWith('reopen civ-')) {
            const ticketId = body.split(' ')[1]?.toUpperCase();
            const snapshot = await db.collection('complaints').where('ticketId', '==', ticketId).limit(1).get();

            if (!snapshot.empty) {
                const doc = snapshot.docs[0];
                const data = doc.data();
                if (data.status === 'resolved') {
                    await doc.ref.update({
                        status: 'reopened',
                        timesReopened: admin.firestore.FieldValue.increment(1),
                        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                        reopenReason: "Reopened via WhatsApp"
                    });
                    await logActivity(doc.id, 'citizen_reopened', phoneNumber, 'citizen', { source: 'whatsapp' }, "Reopened via WhatsApp");
                    await sendWhatsAppMessage(from, getMsg(user.lang, 'reopen_success', { ticketId }));
                } else {
                    await sendWhatsAppMessage(from, getMsg(user.lang, 'reopen_fail'));
                }
            } else {
                await sendWhatsAppMessage(from, getMsg(user.lang, 'not_found'));
            }
            res.status(200).send("");
            return;
        }

        // 3. State Machine
        let replyMsg = "";
        let nextState: BotState = user.state;

        switch (user.state) {
            case 'LANG_SELECT':
                if (body === '1' || lowerBody.includes('english')) {
                    user.lang = 'en';
                    nextState = 'MENU';
                    replyMsg = getMsg('en', 'welcome_menu');
                } else if (body === '2' || lowerBody.includes('hindi')) {
                    user.lang = 'hi';
                    nextState = 'MENU';
                    replyMsg = getMsg('hi', 'welcome_menu');
                } else {
                    replyMsg = MESSAGES.en.welcome_lang; // Repeat
                }
                break;

            case 'MENU':
                if (body === '1') {
                    // Rate Limit Check
                    if (user.complaintCount1h >= 3) {
                        replyMsg = getMsg(user.lang, 'rate_limit');
                    } else {
                        nextState = 'NEW_COMPLAINT_TITLE';
                        replyMsg = getMsg(user.lang, 'ask_title');
                    }
                } else if (body === '2') {
                    // My Complaints
                    // Wait, we need the userId.
                    let userId = await getUserIdFromPhone(phoneNumber);
                    if (userId) {
                        const mySnaps = await db.collection('complaints')
                            .where('userId', '==', userId)
                            .get();

                        if (mySnaps.empty) {
                            replyMsg = getMsg(user.lang, 'my_complaints_empty');
                        } else {
                            // In-memory sort to avoid index requirement
                            const sortedDocs = mySnaps.docs.sort((a, b) => {
                                const tA = a.data().createdAt?.toDate().getTime() || 0;
                                const tB = b.data().createdAt?.toDate().getTime() || 0;
                                return tB - tA;
                            }).slice(0, 3);

                            let list = getMsg(user.lang, 'my_complaints_header') + "\n";
                            sortedDocs.forEach(d => {
                                const dd = d.data();
                                list += `\n${dd.ticketId || '---'} · ${dd.category} · ${dd.status}`;
                            });
                            replyMsg = list;
                        }
                    } else {
                        replyMsg = getMsg(user.lang, 'my_complaints_empty');
                    }
                } else if (body === '3') {
                    replyMsg = getMsg(user.lang, 'help');
                } else {
                    replyMsg = getMsg(user.lang, 'welcome_menu');
                }
                break;

            case 'NEW_COMPLAINT_TITLE':
                if (!body) {
                    replyMsg = getMsg(user.lang, 'invalid_input');
                } else {
                    user.tempData.title = body;
                    nextState = 'NEW_COMPLAINT_DESC';
                    replyMsg = getMsg(user.lang, 'ask_desc');
                }
                break;

            case 'NEW_COMPLAINT_DESC':
                if (!body) {
                    replyMsg = getMsg(user.lang, 'invalid_input');
                } else {
                    user.tempData.description = body;
                    nextState = 'NEW_COMPLAINT_LOC';
                    replyMsg = getMsg(user.lang, 'ask_loc');
                }
                break;

            case 'NEW_COMPLAINT_LOC':
                if (lat && lng) {
                    user.tempData.lat = lat;
                    user.tempData.lng = lng;
                    nextState = 'NEW_COMPLAINT_MEDIA';
                    replyMsg = getMsg(user.lang, 'ask_media');
                } else {
                    replyMsg = getMsg(user.lang, 'ask_loc');
                }
                break;

            case 'NEW_COMPLAINT_MEDIA':
                let attachments = [];
                if (mediaUrl) {
                    attachments.push({
                        type: mediaType?.startsWith('audio') ? 'audio' : 'image',
                        url: mediaUrl
                    });
                }

                if (mediaUrl || lowerBody === 'skip') {
                    // FINAL SUBMIT
                    const ticketId = await createComplaintFromSession(phoneNumber, user.tempData, attachments);
                    replyMsg = getMsg(user.lang, 'complaint_created', { ticketId });

                    // Update User Stats
                    user.complaintCount1h += 1;
                    user.lastComplaintAt = admin.firestore.Timestamp.now();
                    nextState = 'MENU';
                    user.tempData = {};
                } else {
                    replyMsg = getMsg(user.lang, 'ask_media');
                }
                break;
        }

        // 4. Save State
        user.state = nextState;
        user.lastActiveAt = admin.firestore.Timestamp.now();
        await userRef.set(user);

        // 5. Send Reply
        if (replyMsg) {
            await sendWhatsAppMessage(from, replyMsg);
        }

        res.status(200).send("");

    } catch (error) {
        console.error("Error processing WhatsApp webhook:", error);
        res.status(200).send("");
    }
};

// --- Helper: Get User ID ---
const getUserIdFromPhone = async (phoneNumber: string): Promise<string> => {
    try {
        const userRecord = await admin.auth().getUserByPhoneNumber(phoneNumber);
        return userRecord.uid;
    } catch (e) {
        // Create if not exists
        try {
            const newUser = await admin.auth().createUser({
                phoneNumber: phoneNumber,
                displayName: `WhatsApp User ${phoneNumber.slice(-4)}`
            });
            await db.collection('users').doc(newUser.uid).set({
                phoneNumber,
                role: 'citizen',
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            });
            return newUser.uid;
        } catch (createErr) {
            console.error("Failed to create user", createErr);
            return "unknown_user";
        }
    }
};

// --- Helper: Create Complaint ---
const createComplaintFromSession = async (phoneNumber: string, data: any, attachments: any[]) => {
    const from = `whatsapp:${phoneNumber}`;
    const userId = await getUserIdFromPhone(phoneNumber);

    // AI Classification
    let category = 'General';
    let priority = 'medium';
    let summary = '';

    if (process.env.AI_API_KEY && process.env.AI_API_BASE_URL) {
        try {
            const apiKey = process.env.AI_API_KEY;
            const apiBaseUrl = process.env.AI_API_BASE_URL;
            const prompt = `Analyze:\nTitle: ${data.title}\nDescription: ${data.description}\nProvide JSON: { category, priority, summary }\nCategories: Roads, Electricity, Water, Waste, Public Safety, General`;

            const aiResponse = await axios.post(
                `${apiBaseUrl}?key=${apiKey}`,
                { contents: [{ parts: [{ text: prompt }] }] },
                { timeout: 5000 }
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

    // Location
    const latitude = parseFloat(data.lat);
    const longitude = parseFloat(data.lng);
    let locationData = {
        lat: latitude,
        lng: longitude,
        address: "Pinned from WhatsApp"
    };
    const area = lookupAdminArea(latitude, longitude);
    // @ts-ignore
    locationData = { ...locationData, ...area };

    // Format Attachments for Firestore
    const formattedAttachments = attachments.map(a => ({
        fileId: `wa_${Date.now()}`,
        name: a.type === 'audio' ? 'Voice Note' : 'WhatsApp Image',
        webViewLink: a.url,
        thumbnailLink: a.url,
        type: a.type
    }));

    // Create Doc
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
        attachments: formattedAttachments,
        upvotes: 0,
        upvotedBy: [],
        timesReopened: 0,
        isEscalated: false,
        supportCount: 1
    });

    // Generate Ticket ID
    const ticketId = generateTicketId(docRef.id);
    await docRef.update({ ticketId });

    // 6. Final Reply
    const finalMsg = `✅ *Complaint Registered!*\n\n🆔 ID: ${ticketId}\n📂 Category: ${category}\n🚦 Priority: ${priority}\n\nWe will notify you of updates.`;
    await sendWhatsAppMessage(from, finalMsg);

    return ticketId;
};
