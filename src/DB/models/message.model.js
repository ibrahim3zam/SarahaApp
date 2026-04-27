import { model, Schema, Types } from 'mongoose';
import { imageSchema } from './user.model.js';

const messageSchema = new Schema(
  {
    body: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    images: [imageSchema],
    from: {
      type: Types.ObjectId,
      ref: 'User',
    },
    to: {
      type: Types.ObjectId,
      ref: 'User',
      required: true,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);
messageSchema.pre('validate', function () {
  if (!this.body && (!this.images || this.images.length === 0)) {
    this.invalidate('body', 'Message must have a body or at least one image');
  }
  
});

export const messageModel = model('messages', messageSchema);
