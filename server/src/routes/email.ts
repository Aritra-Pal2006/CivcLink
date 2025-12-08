import { Router } from 'express';
import nodemailer from 'nodemailer';
import { verifyToken } from '../middleware/auth';

const router = Router();

router.post('/send', verifyToken, async (req, res) => {
    const { to, subject, body } = req.body;

    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT),
        secure: false, // true for 465, false for other ports
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASSWORD,
        },
    });

    try {
        await transporter.sendMail({
            from: process.env.EMAIL_FROM,
            to,
            subject,
            text: body,
        });
        res.json({ success: true });
    } catch (error) {
        console.error("Email Error:", error);
        res.status(500).json({ error: 'Failed to send email' });
    }
});

export default router;
