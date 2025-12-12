import twilio from 'twilio';
import i18n from '../config/i18n';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_WHATSAPP_NUMBER; // e.g. +14155238886

const client = (accountSid && authToken) ? twilio(accountSid, authToken) : null;

export const sendWhatsAppMessage = async (toPhone: string, message: string) => {
    if (process.env.ENABLE_WHATSAPP_NOTIFICATIONS !== 'true') {
        console.log("ℹ️ WhatsApp notifications disabled. Skipping message to:", toPhone);
        return;
    }

    if (!client || !fromNumber) {
        console.warn("⚠️ Twilio credentials missing. Cannot send WhatsApp message.");
        return;
    }

    try {
        // Ensure 'to' has whatsapp: prefix if not present (Twilio requires it)
        // But usually we store phone numbers as E.164. Twilio needs 'whatsapp:+1234567890'
        const to = toPhone.startsWith('whatsapp:') ? toPhone : `whatsapp:${toPhone}`;
        const from = fromNumber.startsWith('whatsapp:') ? fromNumber : `whatsapp:${fromNumber}`;

        const response = await client.messages.create({
            body: message,
            from: from,
            to: to
        });

        console.log(`✅ WhatsApp sent to ${to}: ${response.sid}`);
    } catch (error) {
        console.error("❌ Error sending WhatsApp message:", error);
    }
};

export const sendLocalizedWhatsAppMessage = async (toPhone: string, templateKey: string, data: any, locale: string = 'en') => {
    const message = i18n.t(templateKey, { ...data, lng: locale }) as string;
    await sendWhatsAppMessage(toPhone, message);
};
