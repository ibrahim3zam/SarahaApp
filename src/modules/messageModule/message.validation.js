
import joi from 'joi';
import { generateValidation } from '../../middleware/validation.middleware.js';

export const sendMessageSchema = joi.object({
    body: generateValidation.messageBody,
    images: joi.array().items(generateValidation.file),
    to: generateValidation.id.required(),
});

