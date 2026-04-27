import { Schema, model, Types } from 'mongoose';

const revokeTokenSchema = new Schema(
  {
    jti: {
      type: String,
      required: true,
      unique: true,
    },
    expiredIn: {
      type: Date,
      required: true,
    },
    user: {
      type: Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
); 

// Automatically remove expired tokens from the database after their expiration time has passed
revokeTokenSchema.index(
  { expiredIn: 1 },
  { expireAfterSeconds: 0 }
);
export const RevokeToken = model('revokeToken', revokeTokenSchema);
