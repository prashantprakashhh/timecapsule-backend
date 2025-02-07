import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import client from "../config/db.js"; // Postgres client
import bcrypt from "bcryptjs";

const router = express.Router();

/**
 * GET /api/users
 *  - If you want to list all users EXCEPT the currently logged in user,
 *    we can do that in one query (filtering by user_id <> req.user._id).
 */
router.get("/", protectRoute, async (req, res) => {
  try {
    const myUserId = req.user._id; // set by auth middleware
    // Return all users except the current user
    const query = `
      SELECT 
        user_id AS _id,
        full_name,
        email,
        profile_pic
      FROM users
      WHERE user_id <> $1
      ORDER BY user_id ASC
    `;
    const { rows } = await client.query(query, [myUserId]);
    res.status(200).json(rows);
  } catch (err) {
    console.error("Error in GET /api/users:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

/**
 * GET /api/users/:id
 *  - Fetch a single user by ID
 */
router.get("/:id", protectRoute, async (req, res) => {
  try {
    const { id } = req.params; // numeric user_id
    const query = `
      SELECT
        user_id AS _id,
        full_name,
        email,
        profile_pic
      FROM users
      WHERE user_id = $1
    `;
    const { rows } = await client.query(query, [id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json(rows[0]);
  } catch (err) {
    console.error("Error in GET /api/users/:id:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

/**
 * POST /api/users
 *  - Create a new user (if you're not already using /auth/signup)
 *  - This example stores hashed password if you want to allow direct creation.
 */
router.post("/", protectRoute, async (req, res) => {
  try {
    const { fullName, email, password } = req.body;
    // Validate data
    if (!fullName || !email || !password) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Check if user already exists
    const checkRes = await client.query(
      "SELECT user_id FROM users WHERE email = $1",
      [email]
    );
    if (checkRes.rowCount > 0) {
      return res.status(400).json({ message: "Email already exists" });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Insert user
    const insertQuery = `
      INSERT INTO users (full_name, email, password)
      VALUES ($1, $2, $3)
      RETURNING user_id AS _id, full_name, email, profile_pic
    `;
    const values = [fullName, email, hashedPassword];
    const { rows } = await client.query(insertQuery, values);

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error("Error in POST /api/users:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

/**
 * PUT /api/users/:id
 *  - Update user details (e.g., name, email, password, profilePic).
 */
router.put("/:id", protectRoute, async (req, res) => {
  try {
    const { id } = req.params;
    const { fullName, email, password, profilePic } = req.body;

    // Optionally, handle password hashing if provided
    let hashedPassword;
    if (password) {
      const salt = await bcrypt.genSalt(10);
      hashedPassword = await bcrypt.hash(password, salt);
    }

    const updateQuery = `
      UPDATE users
      SET
        full_name = COALESCE($1, full_name),
        email = COALESCE($2, email),
        password = COALESCE($3, password),
        profile_pic = COALESCE($4, profile_pic)
      WHERE user_id = $5
      RETURNING user_id AS _id, full_name, email, profile_pic
    `;
    const values = [
      fullName || null,
      email || null,
      hashedPassword || null,
      profilePic || null,
      id,
    ];
    const { rows } = await client.query(updateQuery, values);

    if (rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json(rows[0]);
  } catch (err) {
    console.error("Error in PUT /api/users/:id:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

/**
 * DELETE /api/users/:id
 *  - Delete a user by ID
 */
router.delete("/:id", protectRoute, async (req, res) => {
  try {
    const { id } = req.params;
    const deleteQuery = `
      DELETE FROM users
      WHERE user_id = $1
      RETURNING user_id
    `;
    const { rows } = await client.query(deleteQuery, [id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: "User not found or already deleted" });
    }
    res.json({ message: "User deleted" });
  } catch (err) {
    console.error("Error in DELETE /api/users/:id:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

export default router;
