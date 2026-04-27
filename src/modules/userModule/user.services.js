import userModel, { Roles } from '../../DB/models/user.model.js';
import bcrypt, { compare } from 'bcrypt';
import DBService from '../../DB/DbService.js';
import { successRes } from '../../utils/success.res.js';
import jwt from 'jsonwebtoken';
import { verifyToken } from '../../middleware/auth.middleware.js';
import { types } from '../../middleware/auth.middleware.js';
import { template } from '../../utils/sendEmail/generateHtml.js';
import { emailEvent, generateOtp } from '../../utils/sendEmail/emailEvent.js';
import {
  NotFoundError,
  AppError,
  BadRequestError,
  UnauthorizedError,
} from '../../utils/appError.js';
import { nanoid } from 'nanoid';
import { RevokeToken } from '../../DB/models/revokeToken.js';
import { cloudConfig } from '../../utils/multer/cloudinary.js';
import {
  destroyFile,
  uploadSingleFile,
} from '../../utils/multer/cloud.service.js';

const userDB = new DBService(userModel);

export const getProfile = async (req, res) => {
  try {
    // user جاي من middleware
    const user = req.user;

    successRes({ res, data: user });
  } catch (error) {
    return next(new AppError('Server error', 500));
  }
};

export const shareProfile = async (req, res) => {
  const user = req.user; // جاي من middleware
  const link = `${process.env.BASE_URL}/users/user-profile/${user._id}`
              ;
  successRes({ res, data: { message: 'Profile shared successfully', link } });
};

export const userProfile = async (req, res) => {
  const user = req.params.id;
  console.log(user);
  const profile = await userModel
    .findById(req.params.id)
    .select('-password -emailOtp -passwordResetOtp');
  if (!profile) {
    throw new NotFoundError();
  }
  successRes({ res, data: profile });
};

export const updateUser = async (req, res) => {
  const user = req.user; // جاي من middleware
  const { name, age, phone } = req.body;

  const updatedData = {};
  if (name) updatedData.name = name;
  if (age) updatedData.age = age;
  if (phone) updatedData.phone = phone;
  const updatedUser = await userDB.updateOne({ _id: user._id }, updatedData, {
    new: true,
  });

  successRes({ res, data: updatedUser });
};

export const uploadProfileImage = async (req, res) => {
  const user = req.user;
  const file = req.file;

  if (!file) {
    throw new BadRequestError('No file uploaded');
  }

  const { secure_url, public_id } = await uploadSingleFile({
    path: file.path,
    folder: `Users/${user.name}_${user._id}/Profile`,
  });
  if (user.profileImage?.public_id) {
    await destroyFile(user.profileImage.public_id);
  }

  user.profileImage = {
    secure_url: secure_url,
    public_id: public_id,
  };

  await user.save();

  successRes({
    res,
    data: {
      message: 'Profile image uploaded successfully',
      profileImage: user.profileImage,
    },
  });
};
export const updateCoverImages = async (req, res) => {
  for (const file of req.files) {
    const { secure_url, public_id } = await uploadSingleFile({
      path: file.path,
      folder: `Users/${req.user.name}_${req.user._id}/Cover`,
    });
    req.user.coverImages = req.user.coverImages || [];
    req.user.coverImages.push({ secure_url, public_id });
  }

  req.user.markModified('coverImages');
  await req.user.save();

  successRes({
    res,
    data: {
      message: 'Cover images updated successfully',
      coverImages: req.user.coverImages,
    },
  });
};

export const softDeleteUser = async (req, res) => {
  const targetUser = await userDB.findById(req.params.id);
  if (!targetUser) {
    throw new NotFoundError("User not found");
  }
  const isAdminAction=req.user.role === Roles.admin;
  if(!isAdminAction){
  return next(new UnauthorizedError('Unauthorized'));
  }
  
  targetUser.isActive = false;
  targetUser.deletedBy = req.user._id;
  await targetUser.save();
  successRes({ res, data: 'User soft deleted successfully' });
};

export const restoreUser = async (req, res) => {
  const id = req.params.id;
  const user = req.user;
  const loggedUser = await userDB.findById(user._id);
  if (!loggedUser) {
    throw new NotFoundError();
  }
  if (user.isActive) {
    throw new BadRequestError('User is already active');
  }
  if (loggedUser.role !== 'admin' && String(user._id) !== id) {
    throw new UnauthorizedError('Unauthorized');
  }
  user.isActive = true;
  user.deletedBy = undefined;
  await user.save();
  successRes({ res, data: 'User restored successfully' });
};

export const hardDeleteUser = async (req, res) => {
  const id = req.params.id;
  const user = req.user;
  const loggedUser = await userDB.findById(user._id);
  if (!loggedUser) {
    throw new NotFoundError();
  }
  if (loggedUser.role !== 'admin' && String(user._id) !== id) {
    throw new UnauthorizedError('Unauthorized');
  }
  await userDB.deleteOne({ _id: id });

  successRes({ res, data: 'User hard deleted successfully' });
};
