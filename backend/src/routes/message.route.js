// import express from "express";
// import { protectRoute } from "../middleware/auth.middleware.js";
// import { getMessages, getUsersForSidebar, sendMessage } from "../controllers/message.controller.js";
// import multer from "multer";
// const router = express.Router();

// router.get("/users", protectRoute, getUsersForSidebar);
// router.get("/:id", protectRoute, getMessages);

// // router.post("/send/:id", protectRoute, sendMessage);

// const upload = multer();
// router.post("/send/:id", protectRoute, upload.array("images"), sendMessage);
// export default router;


// backend/src/routes/message.route.js
import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import {
  getMessages,
  getUsersForSidebar,
  sendMessage
} from "../controllers/message.controller.js";

// If you still accept images via multipart form data,
// import multer and define your upload middleware.
import multer from "multer";
const upload = multer(); // e.g. in-memory storage

const router = express.Router();

// GET /api/messages/users -> Returns list of other users for sidebar
router.get("/users", protectRoute, getUsersForSidebar);

// GET /api/messages/:id -> Fetch conversation with user "id"
router.get("/:id", protectRoute, getMessages);

// POST /api/messages/send/:id -> Send a message to user "id"
// If you're sending images in multipart/form-data, use upload.array("images") or similar
// If you're sending base64 in JSON, you can remove multer entirely.
router.post("/send/:id", protectRoute, upload.array("images"), sendMessage);

export default router;
