import express from 'express';
import { updateLocale } from '../controllers/userController';

const router = express.Router();

router.put('/:uid/locale', updateLocale);

export default router;
