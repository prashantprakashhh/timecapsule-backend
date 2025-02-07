// backend/src/controllers/memories.controller.js
import client from "../config/db.js";

/**
 * POST /api/memories
 * Body: { memoryType, memoryContent? (for text), memoryBase64? (for images), memoryUrl? }
 * We store it in the 'memories' table.
 */
export const createMemory = async (req, res) => {
  try {
    const userId = req.user._id; // numeric user_id from your auth middleware
    const {
      memoryType,     // 'image', 'video', or 'text'
      memoryContent,  // text content (if text memory)
      memoryBase64,   // base64-encoded image/video if you truly want to store it in DB
      memoryUrl       // optional, if you still want to store a link instead
    } = req.body;

    if (!memoryType) {
      return res.status(400).json({ error: "memoryType is required" });
    }

    // Decide how you store your data in the DB
    // For 'text', you might store memoryContent in 'memory_content'
    // For 'image' or 'video', you could store the base64 in memory_content or the file path in memory_url
    // We'll do a simple approach: text or base64 in memory_content, a direct DB store

    let dbMemoryContent = null;
    let dbMemoryUrl = null;
    if (memoryType === "text") {
      dbMemoryContent = memoryContent;
    } else if (memoryType === "image" || memoryType === "video") {
      // Option A: store the entire base64 string in 'memory_content'
      dbMemoryContent = memoryBase64 || null;
      // Option B: if you prefer a URL approach, set memoryUrl
      dbMemoryUrl = memoryUrl || null;
    }

    const insertQuery = `
      INSERT INTO memories (user_id, memory_type, memory_content, memory_url)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;

    const values = [userId, memoryType, dbMemoryContent, dbMemoryUrl];
    const result = await client.query(insertQuery, values);

    return res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Error in createMemory:", error.message);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// GET /api/memories

export const listUserMemories = async (req, res) => {
  try {
    const userId = req.user._id;

    const selectQuery = `
      SELECT *
      FROM memories
      WHERE user_id = $1
      ORDER BY upload_date DESC
    `;

    const { rows: memories } = await client.query(selectQuery, [userId]);

    // Each row: { memory_id, user_id, memory_type, memory_content, memory_url, upload_date }
    // You can transform these if needed
    return res.status(200).json(memories);
  } catch (error) {
    console.error("Error in listUserMemories:", error.message);
    return res.status(500).json({ error: "Internal server error" });
  }
};
