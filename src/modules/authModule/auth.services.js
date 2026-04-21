import userModel from "../../DB/models/user.model.js";
 import bcrypt, { compare } from "bcrypt";
import DBService from "../../DB/DbService.js";
import { successRes } from "../../utils/success.res.js";
import jwt from "jsonwebtoken";
import { verifyToken } from "../../middleware/auth.middleware.js";
import { types } from "../../middleware/auth.middleware.js";
import { template } from "../../utils/sendEmail/generateHtml.js";
import { emailEvent, generateOtp } from "../../utils/sendEmail/emailEvent.js";
import { NotFoundError } from "../../utils/Errors.js";
import { nanoid } from "nanoid";
import {RevokeToken} from "../../DB/models/revokeToken.js";
import { cloudConfig } from "../../utils/multer/cloudinary.js";
import { destroyFile, uploadSingleFile } from "../../utils/multer/cloud.service.js";

const userDB = new DBService(userModel);

 export const signUp = async (req, res) => {
    const { name, email, password, age, phone, role, gender } = req.body;
    const isExist = await userDB.findOne({ email });
    if (isExist) {
        throw new Error("Email already exists");
    }
    const hash = await bcrypt.hash(password,5);
    const otp = generateOtp();
const hashOtp = await bcrypt.hash(otp, 5);
    const newUser = new userModel({
        name,
        email,
        password:hash,
        age,
        phone,
        role,
        gender,
        emailOtp: {
            otp: hashOtp, // تخزين ال OTP كهاش
            expiredIn: new Date(Date.now() + 10 * 60 * 1000) // صلاحية ال OTP لمدة 10 دقائق
        }
    });
    
    await newUser.save();
    emailEvent.emit("sendEmail", { to: email, subject: "Email Verification", html: template(otp, "Email Verification", "Please use the following OTP to verify your email address.") });
    successRes({res ,data:newUser,status:201})
 }




 export const signIn = async (req, res) => {
  const { email, password } = req.body;

  const user = await userDB.findOne({ email });
  if (!user) {
    throw new Error("Invalid email or password");
  }
  if(user.confirmEmail==false){
    throw new Error("Please confirm your email first");
  }
  if (!user.isActive) {
  throw new Error("Your account has been deactivated. Please contact support.");
}

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw new Error("Invalid email or password");
  }

const accessJti = nanoid();
const refreshJti = nanoid();

  const payload = { id: user._id, role: user.role };

  const accessToken = jwt.sign(
  {
    id: user._id,
    jti: accessJti,
    type: "access"
  },

  process.env.ACCESS_TOKEN_SECRET,
  { expiresIn: "1h" }
);

 const refreshToken = jwt.sign(
  {
    id: user._id,
    type: types.refresh,
  },
  process.env.REFRESH_TOKEN_SECRET,
  {
    expiresIn: "7d",
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
  try {
    const { authorization } = req.headers;

    const payload = verifyToken(authorization, types.refresh);

    const isRevoked = await RevokeToken.findOne({ jti: payload.jti });
    if (isRevoked) {
      throw new Error("Token is revoked");
    }

    const user = await userModel.findById(payload.id);
    if (!user) {
      throw new Error("User not found");
    }

    if (!user.confirmEmail) {
      throw new Error("Please confirm your email first");
    }

    if (!user.isActive) {
      throw new Error("Your account has been deactivated");
    }

    if (
      user.credentialsChangedAt &&
      user.credentialsChangedAt.getTime() > payload.iat * 1000
    ) {
      throw new Error("Please login again");
    }

   

    const newAccessToken = jwt.sign(
      {
        id: user._id,
        role: user.role,
        type: types.access,
      },
      process.env.ACCESS_TOKEN_SECRET,
      {
        expiresIn: "15m",
        jwtid: nanoid(),
      }
    );

    successRes({ res, data: { accessToken: newAccessToken } });
  } catch (error) {
    return res.status(401).json({ message: error.message });
  }
};



export const confirmEmail = async (req, res, next) => {
  const { email, otp } = req.body;

  const user = await userDB.findOne({ email });

  if (!user) {
    return next(new Error("Invalid email"));
  }
if(user.emailOtp.expiredIn < new Date()){
  return next(new Error("OTP expired"));
}
  // لو confirmed قبل كده
  if (user.confirmEmail === true) {
    return res.status(400).json({ message: "Email already confirmed" });
  }

  // تأكد إن فيه otp
  if (!otp || !user.emailOtp?.otp) {
    return next(new Error("Invalid or expired OTP"));
  }

  // 🔥 المقارنة الصح (تم التعديل لأن الـ otp محفوظ كنص عادي)
  const isMatch = await bcrypt.compare(otp, user.emailOtp.otp);

  if (!isMatch) {
    return next(new Error("Invalid OTP"));
  }

  // ✅ بعد ما نتأكد نعمل update
  await userDB.updateOne(
    { _id: user._id },
    {
      confirmEmail: true,
      $unset: { emailOtp: "" },
    }
  );



  return res.json({ message: "Email confirmed successfully" });
};



export const resendCode = async (req, res, next) => {
  const { email } = req.body;
  const user = await userDB.findOne({ email });
  if (!user) {
    return next(new Error("Invalid email"));
  }
  if(!user.confirmEmail){
    return next(new Error("Email already confirmed"));
  }
  const otp = generateOtp();
  const hashOtp = await bcrypt.hash(otp, 5);
  await userDB.updateOne({ _id: user._id }, { emailOtp: { otp: hashOtp, expiredIn: new Date(Date.now() + 10 * 60 * 1000) } });
  emailEvent.emit("sendEmail", { to: email, subject: "Resend Email Verification", html: template(otp, "Resend Email Verification", "Please use the following OTP to verify your email address.") });
  successRes({ res, data: "OTP resent to email" });
} 




export const forgotPassword = async (req, res,next) => {
  const { email } = req.body;
  const user = await userDB.findOne({ email });
  if (!user) {
    return next(new NotFoundError());
  }
  if(!user.confirmEmail){
    throw new Error("Please confirm your email first");
  }
  const otp = generateOtp();
  const hashOtp = await bcrypt.hash(otp, 5);  

  await userDB.updateOne(
  { _id: user._id },
  {
    passwordResetOtp: {
      otp: hashOtp,
      expiredIn: new Date(Date.now() + 10 * 60 * 1000)
    }
  }
);
  emailEvent.emit("sendPasswordOtp", { to: email, subject: "Password Reset OTP", html: template(otp, "Password Reset", "Please use the following OTP to reset your password.") });
  successRes({ res, data: "OTP sent to email" });
};

export const resetPassword = async (req, res) => {
  const { email, otp, newPassword } = req.body;
  const user = await userDB.findOne({ email });
  if (!user) {
    return next(new NotFoundError());
  }
  if(!user.confirmEmail){
    throw new Error("Please confirm your email first");
  }
  if (!user.passwordResetOtp) {
    throw new Error("No OTP requested");
  }
  console.log(otp,user.passwordResetOtp);
  
  
  const isMatch = await bcrypt.compare(String(otp), String(user.passwordResetOtp.otp));
  if (!isMatch) {
    throw new Error("Invalid OTP");
  }
  const hash = await bcrypt.hash(newPassword, 5);
  await userDB.updateOne({ _id: user._id }, { password: hash , credntialsChangedAt: Date.now() }, { $unset: { passwordResetOtp: "" } });
  successRes({ res, data: "Password reset successfully" });
};










// export const updateEmail = async (req, res,next) => {
//   const user = req.user; 
//   const { newEmail } = req.body;

//   if (newEmail === user.email) {
//     throw new Error("This is your current email");
//   }

//   const isExist = await userDB.findOne({ email: newEmail });
//   if (isExist) {
//     throw new Error("Email already exists");
//   }
//   //old email
  
// const oldEmailOtp= generateOtp();
// user.emailOtp.otp= await bcrypt.hash(oldEmailOtp, 5);
// user.emailOtp.expiredIn= new Date(Date.now() + 10 * 60 * 1000);



// //new email

// const newEmailOtp= generateOtp();
// user.newEmailOtp.otp= await bcrypt.hash(newEmailOtp, 5);
// user.newEmailOtp.expiredIn= new Date(Date.now() + 10 * 60 * 1000);
// emailEvent.emit("sendEmail", { to: user.email, subject: "Confirm Old Email for Email Change", html: template(oldEmailOtp, "Confirm Old Email", "Please use the following OTP to confirm your old email address for email change.") });


// //make confirmEmail false until user confirms new email

//   //store new email in temp field until confirmation
//   emailEvent.emit("sendEmail", { to: newEmail, subject: "Confirm New Email for Email Change", html: template(newEmailOtp, "Confirm New Email", "Please use the following OTP to confirm your new email address for email change.") });
//   user.confirmEmail=false;
//   user.newEmail=newEmail;
//   await user.save();
  
//   successRes({
//     res,
//     data: "Verification code sent to new email",
//   });
// };



// export const confirmEmailChange = async (req, res) => {
//   const { oldEmailOtp, newEmailOtp,email } = req.body;
//   const user=await userDB.findOne({ email });
//   if(!user){
//     throw new NotFoundError();
//   } 

//   if (!user.emailOtp || !user.newEmailOtp) {
//     throw new Error("No OTP requested");
//   }
//   const isOldEmailOtpMatch = await bcrypt.compare(String(oldEmailOtp), String(user.emailOtp.otp));
//   const isNewEmailOtpMatch = await bcrypt.compare(String(newEmailOtp), String(user.newEmailOtp.otp)); 
//   console.log(isOldEmailOtpMatch,isNewEmailOtpMatch);
//   if (!isOldEmailOtpMatch || !isNewEmailOtpMatch) {
//     throw new Error("Invalid OTP");
//   }
//   user.email = user.newEmail;
//   user.newEmail = undefined;
//   user.confirmEmail = true;
//   await user.save();
//   successRes({ res, data: "Email updated successfully" });
// };



export const updateEmail = async (req, res) => {
  const user = req.user;
  const { newEmail } = req.body;

  if (newEmail === user.email) {
    throw new Error("This is your current email");
  }

  const isExist = await userDB.findOne({ email: newEmail });
  if (isExist) {
    throw new Error("Email already exists");
  }

  // generate OTPs
  const oldEmailOtp = generateOtp();
  const newEmailOtp = generateOtp();

  // store hashed OTPs
  user.emailOtp = {
    otp: await bcrypt.hash(oldEmailOtp, 10),
    expiresIn: Date.now() + 10 * 60 * 1000,
  };

  user.newEmailOtp = {
    otp: await bcrypt.hash(newEmailOtp, 10),
    expiresIn: Date.now() + 10 * 60 * 1000,
  };

  user.newEmail = newEmail;
  user.confirmEmail = false;

  await user.save(); // مهم قبل الإرسال

  // send to old email
  emailEvent.emit("sendEmail", {
    to: user.email,
    subject: "Confirm Old Email",
    html: template(
      oldEmailOtp,
      "Confirm Old Email",
      "Use this OTP to confirm your current email"
    ),
  });

  // send to new email
  emailEvent.emit("sendEmail", {
    to: newEmail,
    subject: "Confirm New Email",
    html: template(
      newEmailOtp,
      "Confirm New Email",
      "Use this OTP to confirm your new email"
    ),
  });

  return successRes({
    res,
    data: "Verification codes sent to both emails",
  });
};


export const confirmEmailChange = async (req, res) => {
  const { oldEmailOtp, newEmailOtp } = req.body;
  const user = req.user;

  if (!user.emailOtp || !user.newEmailOtp) {
    throw new Error("No OTP requested");
  }

  if (!user.newEmail) {
    throw new Error("No email change request found");
  }

  // check expiration
  if (
    user.emailOtp.expiresIn < Date.now() ||
    user.newEmailOtp.expiresIn < Date.now()
  ) {
    throw new Error("OTP expired");
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
    throw new Error("Invalid OTP");
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
    data: "Email updated successfully",
  });
};





    export const updatePassword = async (req, res) => {
  const user = req.user;
  const { newPassword, currentPassword } = req.body;

  // check current password
  const isMatch = await bcrypt.compare(currentPassword, user.password);
  if (!isMatch) {
    throw new Error("Current password is incorrect");
  }

  // check new password not same as current
  const isSame = await bcrypt.compare(newPassword, user.password);
  if (isSame) {
    throw new Error("New password must be different");
  }

  // check against old passwords
  for(const oldPass of user.oldPasswords || []) {
    const isOldMatch = await bcrypt.compare(newPassword, oldPass);
    if (isOldMatch) {
      throw new Error("You cannot reuse an old password");
    }
  }


  // save current password in oldPasswords
  user.oldPasswords = user.oldPasswords || [];
  user.oldPasswords.push(user.password);

  // hash new password
  user.password = await bcrypt.hash(newPassword, 10);

  await user.save();

  successRes({ res, data: "Password updated successfully" });
};






export const logOut= async (req, res) => {
  const tokenData=verifyToken(req.headers.authorization);
  const user=req.user;
  if(!user){
    throw new NotFoundError();
  }
  // ait +7*27*60*60 علشان امسح الداتا بيز بعد الفنره دي  وعلشان امسح الjti بعد الexpried بتاعت الrefresh token 
  await RevokeToken.create({
  user: user._id,
  jti: tokenData.jti,
  expiredIn: tokenData.iat + 7 * 24 * 60 * 60
});
  successRes({ res, data: "Logged out successfully" });

}

export const logoutFromAllDevices = async (req, res, next) => {
  const user = req.user;

  if (!user) {
    throw new NotFoundError();
  }

  user.credentialsChangedAt = new Date();
  await user.save();

  successRes({ res, data: "Logged out from all devices successfully" });
};