import { Schema,model,Types } from "mongoose";


const revokeTokenSchema = new Schema({
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
        ref: "User",
        required: true,
    }
}, {
    timestamps: true,
}) 
export  const RevokeToken = model("revokeToken", revokeTokenSchema);