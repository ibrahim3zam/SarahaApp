import multer from 'multer';
import fs from 'fs';
import { BadRequestError } from '../appError.js';

export const fileType = {
  Image: ['image/jpeg', 'image/png', 'image/gif'],
  Video: ['video/mp4', 'video/mpeg', 'video/quicktime'],
  Document: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ],
};

export const cloudUploadFile = ({ type = fileType.Image }) => {
  const storage = multer.diskStorage({});

  const fileFilter = (req, file, cb) => {
    if (type.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new BadRequestError(
          'Invalid file type. Only JPEG, PNG, and GIF are allowed.'
        ),
        false
      );
    }
  };
  return multer({ storage: storage, fileFilter: fileFilter });
};
