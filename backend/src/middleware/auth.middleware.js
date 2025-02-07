import jwt from "jsonwebtoken";
import client from "../config/db.js"; // Your PostgreSQL client

export const protectRoute = async (req, res, next) => {
  try {
    // 1. Retrieve the JWT from cookies
    const token = req.cookies.jwt;
    if (!token) {
      return res.status(401).json({ message: "Unauthorized - No Token Provided" });
    }

    // 2. Verify the token using your secret key
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("Decoded token:", decoded); // For debugging (remove in production)

    // 3. Use the proper key from the decoded payload.
    // Since your token payload is { userId: 2, ... }, we use decoded.userId.
    const userId = decoded.userId;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized - Invalid Token Payload" });
    }

    // 4. Query the database for the user
    const userRes = await client.query(
      "SELECT user_id, full_name, email, profile_pic FROM users WHERE user_id = $1",
      [userId]
    );

    if (userRes.rowCount === 0) {
      console.error("User not found for userId:", userId);
      return res.status(404).json({ message: "User not found" });
    }

    const userRow = userRes.rows[0];
    // Attach the user information to the request object
    req.user = {
      _id: userRow.user_id,
      fullName: userRow.full_name,
      email: userRow.email,
      profilePic: userRow.profile_pic,
    };

    next();
  } catch (error) {
    console.error("Error in protectRoute middleware:", error.message);
    
    // Specific handling for JWT errors
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Token expired" });
    } else if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ message: "Invalid token" });
    }
    
    // If the error is related to DB connectivity (e.g., ETIMEDOUT), it will be logged here.
    return res.status(500).json({ message: "Internal server error" });
  }
};
