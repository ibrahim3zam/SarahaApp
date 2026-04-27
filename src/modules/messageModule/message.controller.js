import { Router } from 'express';
import { uploadFile } from '../../utils/multer/multer.local.js';
import { getMessages, sendMessage } from './message.services.js';
import { auth } from '../../middleware/auth.middleware.js';
import { validation } from '../../middleware/validation.middleware.js';
import { sendMessageSchema } from './message.validation.js';

const router = Router({
  caseSensitive: true,
  strict: true,
});

router.post('/send-message', uploadFile().array('images', 5), validation(sendMessageSchema), sendMessage);
router.get('/get-messages', auth(), getMessages);
export default router;
