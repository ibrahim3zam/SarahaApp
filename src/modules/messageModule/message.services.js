import { uploadSingleFile } from '../../utils/multer/cloud.service.js';
import { successRes } from '../../utils/success.res.js';
import { NotFoundError } from '../../utils/appError.js';
import {messageModel} from '../../DB/models/message.model.js';
import userModel from '../../DB/models/user.model.js';




export const sendMessage = async (req, res) => {
  const { from, to, body } = req.body;

  let sender = null;

  if (from) {
    sender = await userModel.findById(from);
    if (!sender) {
      throw new NotFoundError('Sender not found');
    }
  }

  const receiver = await userModel.findById(to);
  if (!receiver) {
    throw new NotFoundError('Receiver not found');
  }

  const images = [];

  if (req.files?.length) {
    for (const file of req.files) {
      const folder = sender
        ? `Messages/${sender.name}_${sender._id}_to_${receiver.name}_${receiver._id}`
        : `Messages/Anonymous_to_${receiver.name}_${receiver._id}`;

      const { secure_url, public_id } = await uploadSingleFile({
        path: file.path,
        folder,
      });

      images.push({ secure_url, public_id });
    }
  }

  const msg = await messageModel.create({
    from: sender?._id || null,
    to: receiver._id,
    body,
    images, 
  });

  return successRes({
    res,
    message: 'Message sent successfully',
    data: msg,
  });
};

export const getMessages = async (req, res) => {
  //TODO pagination
  const userId = req.user._id;
  const user = await messageModel.find({ to: userId })
  successRes({
    res,
    data: { messages: user },
  });
};
