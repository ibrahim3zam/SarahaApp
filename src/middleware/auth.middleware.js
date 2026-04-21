import jwt from "jsonwebtoken";
import userModel from "../DB/models/user.model.js";
import { RevokeToken } from "../DB/models/revokeToken.js";

export const types = Object.freeze({
  access: "access",
  refresh: "refresh",
});

export const verifyToken = (authorization, tokenType = types.access) => {
  if (!authorization) {
    throw new Error("No token provided");
  }

  const parts = authorization.trim().split(" ");
  if (parts.length !== 2) {
    throw new Error("Invalid token format");
  }

  const [bearer, token] = parts;

  if (bearer !== "Bearer" || !token) {
    throw new Error("Invalid token format");
  }
 const signature =
    tokenType === types.access
      ? process.env.ACCESS_TOKEN_SECRET
      : process.env.REFRESH_TOKEN_SECRET;

      const payload = jwt.verify(token, signature);
  
  if (!payload?.id) {
    throw new Error("Invalid token payload");
  }

  if (!payload?.jti) {
    throw new Error("Token jti is missing");
  }

  if (payload.type !== tokenType) {
    throw new Error("Invalid token type");
  }

  return payload;
};

export const auth = ({ activation = true } = {}) => {
  return async (req, res, next) => {
    try {
      const { authorization } = req.headers;

      const payload = verifyToken(authorization);

      const user = await userModel.findById(payload.id);

      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      const revokedToken = await RevokeToken.findOne({ jti: payload.jti });
      if (revokedToken) {
        return res.status(401).json({
          message: "Token has been revoked. Please login again.",
        });
      }

      if (!user.confirmEmail) {
        return res.status(401).json({
          message: "Please confirm your email first",
        });
      }

      if (
        user.credentialsChangedAt &&
        user.credentialsChangedAt.getTime() > payload.iat * 1000
      ) {
        return res.status(401).json({ message: "Please login again" });
      }

      if (activation && !user.isActive) {
        return res.status(403).json({
          message: "Your account has been deactivated. Please contact support.",
        });
      }

      req.user = user;
      next();
    } catch (error) {
      return res.status(401).json({
        message: error.message || "Invalid or expired token",
      });
    }
  };
};

export const allowRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role?.toString())) {
      return res.status(403).json({
        message: "Forbidden: You don't have permission to access this resource",
      });
    }

    next();
  };
};