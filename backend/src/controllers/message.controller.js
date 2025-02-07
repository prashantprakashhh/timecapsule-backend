// backend/src/controllers/message.controller.js
import client from "../config/db.js";
import { getReceiverSocketId, io } from "../lib/socket.js";

/**
 * getUsersForSidebar
 * Fetch all users (with selected fields) except the currently logged-in user.
 * Returns an array of user objects with keys: _id, fullName, email, profilePic.
 */
export const getUsersForSidebar = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;
    const query = `
      SELECT 
        user_id AS _id,
        full_name AS "fullName",
        email,
        profile_pic AS "profilePic"
      FROM users
      WHERE user_id <> $1
      ORDER BY full_name ASC
    `;
    console.log("Executing query:", query); // Log the query for debugging
    const { rows } = await client.query(query, [loggedInUserId]);
    return res.status(200).json(rows);
  } catch (error) {
    console.error("Error in getUsersForSidebar:", error.message);
    return res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * getMessages
 * GET /api/messages/:id
 * Fetch all messages between the authenticated user and the user specified by :id.
 * Joins messages with message_images (if any) and groups multiple images per message.
 */
export const getMessages = async (req, res) => {
  try {
    const { id: userToChatId } = req.params; // other user's ID
    const myId = req.user._id;

    const query = `
      SELECT m.message_id AS id, m.sender_id, m.receiver_id, m.message_text AS text, m.timestamp,
             mi.image_id, mi.image_data
      FROM messages m
      LEFT JOIN message_images mi ON m.message_id = mi.message_id
      WHERE (m.sender_id = $1 AND m.receiver_id = $2)
         OR (m.sender_id = $2 AND m.receiver_id = $1)
      ORDER BY m.timestamp ASC
    `;
    const { rows } = await client.query(query, [myId, userToChatId]);

    // Group messages by message id so that multiple images are aggregated
    const messagesMap = {};
    rows.forEach((row) => {
      if (!messagesMap[row.id]) {
        messagesMap[row.id] = {
          id: row.id,
          senderId: row.sender_id,
          receiverId: row.receiver_id,
          text: row.text,
          createdAt: row.timestamp,
          images: [],
        };
      }
      if (row.image_data) {
        const base64Str = row.image_data.toString("base64");
        // Assuming PNG for now; adjust if storing different image types
        const dataUrl = `data:image/png;base64,${base64Str}`;
        messagesMap[row.id].images.push({
          imageId: row.image_id,
          image: dataUrl,
        });
      }
    });
    const messages = Object.values(messagesMap);
    return res.status(200).json(messages);
  } catch (error) {
    console.error("Error in getMessages:", error.message);
    return res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * sendMessage
 * POST /api/messages/send/:id
 * Sends a message (with optional image) from the authenticated user to the user specified by :id.
 * Expects a request body like: { text: "Hello", image: "data:image/png;base64,..." }
 */
export const sendMessage = async (req, res) => {
  try {
    const { text, image } = req.body; // 'text' is a string, 'image' is a base64 string if provided
    const { id: receiverId } = req.params;
    const senderId = req.user._id;

    // 1) Insert the message into the messages table
    const insertMessageQuery = `
      INSERT INTO messages (sender_id, receiver_id, message_text)
      VALUES ($1, $2, $3)
      RETURNING message_id, sender_id, receiver_id, message_text, timestamp
    `;
    const messageResult = await client.query(insertMessageQuery, [
      senderId,
      receiverId,
      text || "",
    ]);
    const newMessage = messageResult.rows[0];

    let imageUrl = null;
    if (image) {
      // 2) Process the image:
      // Remove the data URL prefix (e.g., "data:image/png;base64,")
      const base64Data = image.replace(/^data:.+;base64,/, "");
      // Convert the remaining base64 string into a binary Buffer
      const imageBuffer = Buffer.from(base64Data, "base64");

      // 3) Insert the binary image data into the message_images table (BYTEA column)
      const insertImageQuery = `
        INSERT INTO message_images (message_id, image_data)
        VALUES ($1, $2)
        RETURNING image_id
      `;
      await client.query(insertImageQuery, [newMessage.message_id, imageBuffer]);

      // 4) For immediate response, rebuild a data URL from the binary data
      imageUrl = `data:image/png;base64,${imageBuffer.toString("base64")}`;
    }

    // 5) Construct the final message object
    const finalMessage = {
      id: newMessage.message_id,
      senderId: newMessage.sender_id,
      receiverId: newMessage.receiver_id,
      text: newMessage.message_text,
      createdAt: newMessage.timestamp,
      images: imageUrl ? [{ image: imageUrl }] : [],
    };

    // 6) Broadcast the new message via Socket.io, if the receiver is online
    const receiverSocketId = getReceiverSocketId(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("newMessage", finalMessage);
    }

    // 7) Return the final message to the sender
    return res.status(201).json(finalMessage);
  } catch (error) {
    console.error("Error in sendMessage:", error.message);
    return res.status(500).json({ error: "Internal server error" });
  }
};
