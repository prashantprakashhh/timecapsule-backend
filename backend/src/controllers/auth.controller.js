import bcrypt from "bcryptjs";
import { generateToken } from "../lib/utils.js";
import client from "../config/db.js";


//Signup
export const signup = async (req, res) => {
  try{
    const {fullName, email, password} = req.body;

    //Basic Validation
    if (!fullName || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }
    if (password.length < 6) {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters" });
    }

    const checkUser = await client.query("SELECT * FROM users WHERE email = $1", [email]);
    if (checkUser.rows.length > 0) {
      return res.status(400).json({ message: "Email already exists" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);


    //Insert new user into DB
    // 'RETURNING *' gives back the inserted row, including user_id.
    const insertRes = await client.query(
      `INSERT INTO users (full_name, email, password)
       VALUES ($1, $2, $3)
       RETURNING user_id, full_name, email, profile_pic;`,
      [fullName, email, hashedPassword]
    );

    const newUser = insertRes.rows[0]; // { user_id, full_name, email, profile_pic }

    //Generate token
    generateToken(newUser.user_id, res);

    return res.status(201).json({
      _id: newUser.user_id,   // or rename user_id -> _id for consistency
      fullName: newUser.full_name,
      email: newUser.email,
      profilePic: newUser.profile_pic,
    });
  } catch (error) {
    console.error("Error in signup controller", error.message);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

//Login
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1) Fetch user by email
    const userRes = await client.query(
      "SELECT user_id, full_name, email, password, profile_pic FROM users WHERE email = $1",
      [email]
    );

    if (userRes.rowCount === 0) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const user = userRes.rows[0];

    // 2) Compare password
    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // 3) Generate token
    generateToken(user.user_id, res);

    return res.status(200).json({
      _id: user.user_id,
      fullName: user.full_name,
      email: user.email,
      profilePic: user.profile_pic,
    });
  } catch (error) {
    console.error("Error in login controller", error.message);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

//Logout
export const logout = (req, res) => {
  try {
    // Clears the cookie
    res.cookie("jwt", "", { maxAge: 0 });
    return res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    console.error("Error in logout controller", error.message);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};



//Update Profile
export const updateProfile = async (req, res) => {
  try {
    const userId = req.user._id; // assuming your auth middleware sets req.user._id
    const { profilePic } = req.body; // base64 from the client
    
    if (!profilePic) {
      return res.status(400).json({ message: "Profile pic is required" });
    }

    // For a real app, you’d probably do validation of base64 or convert it to binary.
    // We’ll assume the base64 is valid.

    // 1) Update the user's profile_pic in DB
    const updateRes = await client.query(
      "UPDATE users SET profile_pic = $1 WHERE user_id = $2 RETURNING user_id, full_name, email, profile_pic",
      [profilePic, userId]
    );

    if (updateRes.rowCount === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const updatedUser = updateRes.rows[0];

    return res.status(200).json({
      _id: updatedUser.user_id,
      fullName: updatedUser.full_name,
      email: updatedUser.email,
      profilePic: updatedUser.profile_pic,
    });
  } catch (error) {
    console.error("Update Profile Error:", {
      error: error.message,
      stack: error.stack,
      body: req.body,
    });
    return res.status(500).json({
      message: "Profile update failed",
      error: process.env.NODE_ENV === "development" ? error.message : null,
    });
  }
};

//Check Auth
export const checkAuth = (req, res) => {
  try {
    // No DB call needed here. If your middleware has set req.user,
    // you already have user info or user_id in the request.
    return res.status(200).json(req.user);
  } catch (error) {
    console.error("Error in checkAuth controller", error.message);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};