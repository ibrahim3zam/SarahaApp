import userModel from "../../DB/models/user.model.js";
import { uploadSingleFile } from "../../utils/multer/cloud.service.js";
import { successRes } from "../../utils/success.res.js";




export const sendMessage = async (req, res) => {

    const { from ,to,body } = req.body;

    let sender = null;
    if(from){
        sender = await userModel.findById(from);
        if(!sender){
            return res.status(404).json({ message: "Sender not found" });
        }
    }
    const receiver = await userModel.findById(to);
    if (!receiver) {
        return res.status(404).json({ message: "Receiver not found" });
    }
    const images=[]
    if(req.files){
        for (const file of req.files) {
            const folder = sender 
                ? `Messages/${sender.name}_${sender._id}_to_${receiver.name}_${receiver._id}` 
                : `Messages/Anonymous_to_${receiver.name}_${receiver._id}`;
            const { secure_url, public_id } = await uploadSingleFile({ path: file.path, folder });
            images.push({ secure_url, public_id });
        }
    }

    const message = {
        from,
        to,
        body,
        images,
        timestamp: new Date(),
    };
    receiver.messages = receiver.messages || [];
    receiver.messages.push(message);
    
    // إخبار مونجوس بتحديث المصفوفة حتى يحفظها بشكل سليم
    receiver.markModified("messages");
    
    await receiver.save();
    successRes({
        res,

        data: {"Message sent successfully": receiver}
        

    });
   }


export const getMessages = async (req, res) => {
    const userId = req.user._id;
    const user = await userModel.findById(userId).populate({ path: "messages" });
    successRes({
        res,
        data: { messages: user.messages }
    });
};

