import { Router } from 'express';
import * as authServices from './auth.services.js';
import { userAuth, adminAuth } from '../../middleware/auth.middleware.js';

import { Roles } from '../../DB/models/user.model.js';
import { validation } from '../../middleware/validation.middleware.js';
import {
  confirmEmailSchema,
  loginSchema,
  signUpSchema,
  updateCoverImagesSchema,
  uploadImageSchema,
} from './auth.validation.js';
import { uploadFile } from '../../utils/multer/multer.local.js';
import { cloudUploadFile, fileType } from '../../utils/multer/multer.cloud.js';

const router = Router();
router.post('/signup', validation(signUpSchema), authServices.signUp);
router.post('/signin', validation(loginSchema), authServices.signIn);
router.post('/refresh-token', authServices.refreshToken);
router.patch(
  '/confirm-email',
  validation(confirmEmailSchema),
  authServices.confirmEmail
);
router.post('/forgot-password', authServices.forgotPassword);
router.patch('/reset-password', authServices.resetPassword);
router.post('/resend-code', authServices.resendCode);
router.patch('/update-email', userAuth, authServices.updateEmail);
router.patch('/confirm-new-email', userAuth, authServices.confirmEmailChange);
router.patch('/change-password', userAuth, authServices.updatePassword);
router.post('/logout', userAuth, authServices.logOut);
router.post(
  '/logout-from-all-devices',
  userAuth,
  authServices.logoutFromAllDevices
);
export default router;
