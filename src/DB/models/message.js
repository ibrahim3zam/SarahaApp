import { model, Schema, Types } from "mongoose";
import { imageSchema } from "./user.model";
import { required } from "joi";





const messageSchema = new Schema({
    body: {
        type: String,
        required:function() {
     if(this.images.length()>0){
        return false;
     }
     return true;
    
        }
    },
    images: [imageSchema],
    from: {
        type: Types.ObjectId,
        ref: "User",
    },
    to: {
        type: Types.ObjectId,
        ref: "User",
        required: true,
    },
    isRead: {
        type: Boolean,
        default: false,
    },
}, {
    timestamps: true,
});

export const messageModel = model("messsages", messageSchema);