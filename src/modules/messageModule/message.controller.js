import { Router } from "express";
import { uploadFile } from "../../utils/multer/multer.local.js";
import { getMessages, sendMessage } from "./message.services.js";
import { auth } from "../../middleware/auth.middleware.js";

const router = Router({
    caseSensitive: true,
    strict: true
});


router.post("/send-message",uploadFile().array("images",5),sendMessage)
router.get("/get-messages", auth(),getMessages)
export default router;