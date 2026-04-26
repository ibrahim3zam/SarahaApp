import { compare } from 'bcrypt';
import { Schema, model } from 'mongoose';

export const Roles = {
  user: 'user',
  admin: 'admin',
  superAdmin: 'superAdmin',
};

export const Gender = {
  male: 'male',
  female: 'female',
};

Object.freeze(Roles);
Object.freeze(Gender);

export const imageSchema = new Schema(
  {
    secure_url: {
      type: String,
    },
    public_id: {
      type: String,
    },
  },
  { _id: false }
);
const userSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    newEmail: {
      type: String,
      unique: true,
      sparse: true,
    },
    password: {
      type: String,
      required: true,
      min: 4,
      max: 20,
    },
    oldPasswords: [
      {
        type: String,
      },
    ],
    age: {
      type: Number,
      required: true,
    },
    phone: {
      type: String,
      required: true,
    },
    confirmEmail: {
      type: Boolean,
      default: false,
    },
    emailOtp: {
      otp: String,
      expiredIn: Date,
    },
    passwordResetOtp: {
      otp: String,
      expiredIn: Date,
    },
    newEmailOtp: {
      otp: String,
      expiredIn: Date,
    },
    role: {
      type: String,
      enum: Object.values(Roles),
      default: Roles.user,
    },
    gender: {
      type: String,
      enum: Object.values(Gender),
      default: Gender.male,
    },
    credntialsChangedAt: {
      type: Date,
      default: Date.now,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    deletedBy: {
      type: Schema.Types.ObjectId,
      ref: 'users',
    },
    profileImage: {
      secure_url: {
        type: String,
      },
      public_id: {
        type: String,
      },
    },
    coverImages: [imageSchema],
    messages: [
      {
        from: {
          type: Schema.Types.ObjectId,
          ref: 'users',
        },
        to: {
          type: Schema.Types.ObjectId,
          ref: 'users',
          required: true,
        },
        body: String,
        images: [imageSchema],
        timestamp: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    virtuals: {
      userMessages: {
        get() {
          return 'my age is ' + this.age;
        },
      },
    },
    methods: {
      comparePassword(pass) {
        return compare(pass, this.password);
      },
    },
  }
);

const userModel = model('users', userSchema);

export default userModel;
