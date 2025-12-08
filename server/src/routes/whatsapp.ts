import { Router } from 'express';
import { handleIncomingWebhook } from '../controllers/whatsappController';

const router = Router();

// Twilio Webhook
router.post('/twilio', handleIncomingWebhook);

export default router;
