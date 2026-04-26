import { Router } from 'express';
import { allowRoles, auth } from '../../middleware/auth.middleware.js';
import * as userServices from './user.services.js';
import { Roles } from '../../DB/models/user.model.js';
import { validation } from '../../middleware/validation.middleware.js';
import {
  updateCoverImagesSchema,
  uploadImageSchema,
} from '../authModule/auth.validation.js';
import { uploadFile } from '../../utils/multer/multer.local.js';
import { cloudUploadFile, fileType } from '../../utils/multer/multer.cloud.js';
const router = Router();

router.get(
  '/getUser',
  auth(),
  allowRoles(Roles.admin),
  userServices.getProfile
);
router.get('/share-profile', auth(), userServices.shareProfile);
router.get('/user-profile/:id', userServices.userProfile);
router.patch('/update-profile', auth(), userServices.updateUser);
router.patch(
  '/cover-images',
  auth(),
  uploadFile({ type: fileType.Image }).array('images', 5),
  validation(updateCoverImagesSchema),
  userServices.updateCoverImages
);
router.patch('/soft-delete/:id', auth(), userServices.softDeleteUser);
router.patch(
  '/restore/:id',
  auth({ activation: false }),
  userServices.restoreUser
);
router.delete('/hard-delete/:id', auth(), userServices.hardDeleteUser);
router.patch(
  '/upload-profile',
  auth(),
  cloudUploadFile({ type: fileType.Image }).single('image'),
  validation(uploadImageSchema),
  userServices.uploadProfileImage
);

export default router;
