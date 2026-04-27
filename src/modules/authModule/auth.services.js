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

export const signUp = async (req, res) => {
  const { name, email, password, age, phone, role, gender } = req.body;
  const isExist = await userDB.findOne({ email });
  if (isExist) {
    throw new BadRequestError('Email already exists');
  }
  const saltRounds = parseInt(process.env.SALT) || 10;
  const hash = await bcrypt.hash(password, saltRounds);
  const otp = generateOtp();
  const hashOtp = await bcrypt.hash(otp, saltRounds);
  const newUser = new userModel({
    name,
    email,
    password: hash,
    age,
    phone,
    role: Roles.user,
    gender,
    emailOtp: {
      otp: hashOtp, // تخزين ال OTP كهاش
      expiredIn: new Date(Date.now() + 10 * 60 * 1000), // صلاحية ال OTP لمدة 10 دقائق
    },
  });
  

  await newUser.save();
  emailEvent.emit('sendEmail', {
    to: email,
    subject: 'Email Verification',
    html: template(
      otp,
      'Email Verification',
      'Please use the following OTP to verify your email address.'
    ),
  });
  const safeUser = {
  _id: newUser._id,
  name: newUser.name,
  email: newUser.email,
  role: newUser.role,
};
successRes({
  res,
  status: 201,
  message: 'Account created. Check email for OTP.',
  data: safeUser,
});};

export const signIn = async (req, res) => {
  const { email, password } = req.body;

  const user = await userDB.findOne ({ email } )

  if (!user) {
    throw new BadRequestError('Invalid email or password');
  }
  if (user.confirmEmail == false) {
    throw new BadRequestError('Please confirm your email first');
  }
  if (!user.isActive) {
    throw new BadRequestError(
      'Your account has been deactivated. Please contact support.'
    );
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw new BadRequestError('Invalid email or password');
  }

  const accessJti = nanoid();
  const refreshJti = nanoid();

  // const payload = { id: user._id, role: user.role };

  const accessToken = jwt.sign(
    {
      id: user._id,
      jti: accessJti,
      type: 'access',
    },

    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: '1h' }
  );

  const refreshToken = jwt.sign(
    {
      id: user._id,
      jti: refreshJti,
      type: types.refresh,
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: '7d',
      jwtid: nanoid(),
    }
  );

  user.password = undefined;

  successRes({
    res,
    data: { user, accessToken, refreshToken },
  });
};

export const refreshToken = async (req, res) => {
  
    const { authorization } = req.headers;

    const payload = verifyToken(authorization, types.refresh);

    const isRevoked = await RevokeToken.findOne({ jti: payload.jti });
    if (isRevoked) {
      throw new BadRequestError('Token is revoked');
    }

    const user = await userModel.findById(payload.id);
    if (!user) {
      throw new BadRequestError('User not found');
    }

    if (!user.confirmEmail) {
      throw new BadRequestError('Please confirm your email first');
    }

    if (!user.isActive) {
      throw new BadRequestError('Your account has been deactivated');
    }

    if (
      user.credentialsChangedAt &&
      user.credentialsChangedAt.getTime() > payload.iat * 1000
    ) {
      throw new BadRequestError('Please login again');
    }

    const newAccessToken = jwt.sign(
      {
        id: user._id,
        role: user.role,
        type: types.access,
      },
      process.env.ACCESS_TOKEN_SECRET,
      {
        expiresIn: '15m',
        jwtid: nanoid(),
      }
    );

    successRes({ res, data: { accessToken: newAccessToken } });
};

export const confirmEmail = async (req, res, next) => {
  const { email, otp } = req.body;

  const user = await userDB.findOne({ email });

  if (!user) {
    return next(new NotFoundError('Invalid email'));
  }
  if (user.emailOtp.expiredIn < new Date()) {
    return next(new NotFound('OTP expired'));
  }
  // لو confirmed قبل كده
  if (user.confirmEmail === true) {
    return next(new BadRequestError('Email already confirmed'));
  }

  // تأكد إن فيه otp
  if (!otp || !user.emailOtp?.otp) {
    return next(new Error('Invalid or expired OTP'));
  }

  // 🔥 المقارنة الصح (تم التعديل لأن الـ otp محفوظ كنص عادي)
  const isMatch = await bcrypt.compare(otp, user.emailOtp.otp);

  if (!isMatch) {
    return next(new Error('Invalid OTP'));
  }

  // ✅ بعد ما نتأكد نعمل update
  await userDB.updateOne(
    { _id: user._id },
    {
      confirmEmail: true,
      $unset: { emailOtp: '' },
    }
  );

  return res.json({ message: 'Email confirmed successfully' });
};

export const resendCode = async (req, res, next) => {
  const { email } = req.body;
  const user = await userDB.findOne({ email });
  if (!user) {
    return next(new Error('Invalid email'));
  }
  if (user.confirmEmail) {
    return next(new Error('Email already confirmed'));
  }
  if(user.isEmailSent){
   return next(new Error('OTP already sent. Please check your email or wait before requesting again.')); 
  }
  const otp = generateOtp();
  const hashOtp = await bcrypt.hash(otp, 5);
  
  emailEvent.emit('sendEmail', {
    to: email,
    subject: 'Resend Email Verification',
    html: template(
      otp,
      'Resend Email Verification',
      'Please use the following OTP to verify your email address.'
    ),
  });
  await userDB.updateOne(
    { _id: user._id },
    {
      emailOtp: {
        otp: hashOtp,
        expiredIn: new Date(Date.now() + 10 * 60 * 1000),
      },
        isEmailSent: true,
    }

  );
  successRes({ res, data: 'OTP resent to email' });
};

export const forgotPassword = async (req, res, next) => {
  const { email } = req.body;
  const user = await userDB.findOne({ email });
  if (!user) {
    return next(new NotFoundError());
  }
  if (!user.confirmEmail) {
    throw new BadRequestError('Please confirm your email first');
  }
  const otp = generateOtp();
  const hashOtp = await bcrypt.hash(otp, process.env.SALT);

  await userDB.updateOne(
    { _id: user._id },
    {
      passwordResetOtp: {
        otp: hashOtp,
        expiredIn: new Date(Date.now() + 10 * 60 * 1000),
      },
    }
  );
  emailEvent.emit('sendPasswordOtp', {
    to: email,
    subject: 'Password Reset OTP',
    html: template(
      otp,
      'Password Reset',
      'Please use the following OTP to reset your password.'
    ),
  });
  successRes({ res, data: 'OTP sent to email' });
};

export const resetPassword = async (req, res,next) => {
  const { email, otp, newPassword } = req.body;
  const user = await userDB.findOne({ email });
  if (!user) {
    return next(new NotFoundError());
  }
  if (!user.confirmEmail) {
    throw new BadRequestError('Please confirm your email first');
  }
  if (!user.passwordResetOtp) {
    throw new BadRequestError('No OTP requested');
  }
  console.log(otp, user.passwordResetOtp);

  const isMatch = await bcrypt.compare(
    String(otp),
    String(user.passwordResetOtp.otp)
  );
  if (!isMatch) {
    throw new BadRequestError('Invalid OTP');
  }
  const hash = await bcrypt.hash(newPassword, process.env.SALT);
  await userDB.updateOne(
    { _id: user._id },
    { password: hash, credntialsChangedAt: Date.now() },
    { $unset: { passwordResetOtp: '' } }
  );
  successRes({ res, data: 'Password reset successfully' });
};

export const updateEmail = async (req, res) => {
  const user = req.user;
  const { newEmail } = req.body;

  if (newEmail === user.email) {
    throw new BadRequestError('This is your current email');
  }

  const isExist = await userDB.findOne({ email: newEmail });
  if (isExist) {
    throw new BadRequestError('Email already exists');
  }

  // generate OTPs
  const oldEmailOtp = generateOtp();
  const newEmailOtp = generateOtp();
  saltRounds = parseInt(process.env.SALT) || 10;
  // store hashed OTPs
  user.emailOtp = {
    otp: await bcrypt.hash(oldEmailOtp, saltRounds),
    expiresIn: new Date(Date.now() + 10 * 60 * 1000),
  };

  user.newEmailOtp = {
    otp: await bcrypt.hash(newEmailOtp, saltRounds),
    expiresIn: new Date(Date.now() + 10 * 60 * 1000),
  };

  user.newEmail = newEmail;
  user.confirmEmail = false;

  await user.save(); // مهم قبل الإرسال

  // send to old email
  emailEvent.emit('sendEmail', {
    to: user.email,
    subject: 'Confirm Old Email',
    html: template(
      oldEmailOtp,
      'Confirm Old Email',
      'Use this OTP to confirm your current email'
    ),
  });

  // send to new email
  emailEvent.emit('sendEmail', {
    to: newEmail,
    subject: 'Confirm New Email',
    html: template(
      newEmailOtp,
      'Confirm New Email',
      'Use this OTP to confirm your new email'
    ),
  });

  return successRes({
    res,
    data: 'Verification codes sent to both emails',
  });
};

export const confirmEmailChange = async (req, res) => {
  const { oldEmailOtp, newEmailOtp } = req.body;
  const user = req.user;

  if (!user.emailOtp || !user.newEmailOtp) {
    throw new BadRequestError('No OTP requested');
  }

  if (!user.newEmail) {
    throw new BadRequestError('No email change request found');
  }

  // check expiration
  if (
    user.emailOtp.expiresIn < Date.now() ||
    user.newEmailOtp.expiresIn < Date.now()
  ) {
    throw new BadRequestError('OTP expired');
  }

  // compare OTPs
  const isOldMatch = await bcrypt.compare(
    String(oldEmailOtp),
    user.emailOtp.otp
  );

  const isNewMatch = await bcrypt.compare(
    String(newEmailOtp),
    user.newEmailOtp.otp
  );

  if (!isOldMatch || !isNewMatch) {
    throw new BadRequestError('Invalid OTP');
  }

  // update email
  user.email = user.newEmail;
  user.newEmail = undefined;
  user.confirmEmail = true;

  // remove OTPs after success
  user.emailOtp = undefined;
  user.newEmailOtp = undefined;

  await user.save();

  return successRes({
    res,
    data: 'Email updated successfully',
  });
};

export const updatePassword = async (req, res) => {
  const { newPassword, currentPassword } = req.body;

  const user = await userModel
    .findById(req.user._id)
    .select('+password +oldPasswords');

  if (!user) {
    throw new BadRequestError('User not found');
  }

  const isMatch = await bcrypt.compare(currentPassword, user.password);
  if (!isMatch) {
    throw new BadRequestError('Current password is incorrect');
  }

  const isSame = await bcrypt.compare(newPassword, user.password);
  if (isSame) {
    throw new BadRequestError('New password must be different');
  }

  for (const oldPass of user.oldPasswords || []) {
    const isOldMatch = await bcrypt.compare(newPassword, oldPass);
    if (isOldMatch) {
      throw new BadRequestError('You cannot reuse an old password');
    }
  }

  user.oldPasswords = user.oldPasswords || [];
  user.oldPasswords.push(user.password);

  user.password = await bcrypt.hash(newPassword, 10);
  user.credentialsChangedAt = new Date();

  await user.save();

  return successRes({
    res,
    message: 'Password updated successfully',
  });
};

export const logOut = async (req, res) => {
  const tokenData = verifyToken(req.headers.authorization);
  const user = req.user;
  if (!user) {
    throw new NotFoundError();
  }
  // ait +7*27*60*60 علشان امسح الداتا بيز بعد الفنره دي  وعلشان امسح الjti بعد الexpried بتاعت الrefresh token
  await RevokeToken.create({
    user: user._id,
    jti: tokenData.jti,
    expiredIn:( tokenData.iat + 7 * 24 * 60 * 60) * 1000,
  });
  successRes({ res, data: 'Logged out successfully' });
};

export const logoutFromAllDevices = async (req, res, next) => {
  const user = req.user;

  if (!user) {
    throw new NotFoundError();
  }

  user.credentialsChangedAt = new Date();
  await user.save();

  successRes({ res, data: 'Logged out from all devices successfully' });
};
