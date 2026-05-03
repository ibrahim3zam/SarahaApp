import jwt from 'jsonwebtoken';
import userModel, { Roles } from '../DB/models/user.model.js';
import { RevokeToken } from '../DB/models/revokeToken.js';
import { UnauthorizedError, AppError } from '../utils/appError.js';

export const types = Object.freeze({
  access: 'access',
  refresh: 'refresh',
});

export const verifyToken = (authorization, tokenType = types.access) => {
  if (!authorization) {
    throw new UnauthorizedError('No token provided');
  }

  const parts = authorization.trim().split(' ');
  if (parts.length !== 2) {
    throw new UnauthorizedError('Invalid token format');
  }

  const [bearer, token] = parts;

  if (bearer !== 'Bearer' || !token) {
    throw new UnauthorizedError('Invalid token format');
  }
  const signature =
    tokenType === types.access
      ? process.env.ACCESS_TOKEN_SECRET
      : process.env.REFRESH_TOKEN_SECRET;

  const payload = jwt.verify(token, signature);

  if (!payload?.id) {
    throw new UnauthorizedError('Invalid token payload');
  }

  if (!payload?.jti) {
    throw new UnauthorizedError('Token jti is missing');
  }

  if (payload.type !== tokenType) {
    throw new UnauthorizedError('Invalid token type');
  }

  return payload;
};

export const auth = ({ activation = true, roles = Object.values(Roles) } = {}) => {
  return async (req, res, next) => {
    try {
      const { authorization } = req.headers;

      const payload = verifyToken(authorization);

      const user = await userModel.findById(payload.id);

      if (!user) {
        return next(new UnauthorizedError('User not found'));
      }

      if (!roles.includes(user.role)) {
        return next(
          new AppError(
            "Forbidden: You don't have permission to access this resource",
            403
          )
        );
      }

      const revokedToken = await RevokeToken.findOne({ jti: payload.jti });
      if (revokedToken) {
        return next(
          new UnauthorizedError('Token has been revoked. Please login again.')
        );
      }

      if (!user.confirmEmail) {
        return next(new UnauthorizedError('Please confirm your email first'));
      }

      if (
        user.credntialsChangedAt &&
        user.credntialsChangedAt.getTime() > payload.iat * 1000
      ) {
        return next(new UnauthorizedError('Please login again'));
      }

      if (activation && !user.isActive) {
        return next(
          new AppError(
            'Your account has been deactivated. Please contact support.',
            403
          )
        );
      }

      req.user = user;
      next();
    } catch (error) {
      return next(
        new UnauthorizedError(error.message || 'Invalid or expired token')
      );
    }
  };
};

// Ready-to-use Middlewares
export const userAuth = auth({ roles: [Roles.user, Roles.admin] });
export const adminAuth = auth({ roles: [Roles.admin] });

export const allowRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role?.toString())) {
      return next(
        new AppError(
          "Forbidden: You don't have permission to access this resource",
          403
        )
      );
    }

    next();
  };
};
