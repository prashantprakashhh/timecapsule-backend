import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { createMemory, listUserMemories } from "../controllers/memories.controller.js";

const router = express.Router();

/**
 * GET /api/memories
 *   - Protected route
 *   - Lists all memories (from PostgreSQL) for the logged-in user
 */
router.get("/", protectRoute, listUserMemories);

/**
 * POST /api/memories
 *   - Protected route
 *   - Creates a new memory in PostgreSQL (image, text, or video)
 */
router.post("/", protectRoute, createMemory);

export default router;

