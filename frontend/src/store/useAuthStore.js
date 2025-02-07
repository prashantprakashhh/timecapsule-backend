import { create } from "zustand";
import axios from "axios";
import toast from "react-hot-toast";
import { io } from "socket.io-client";

// Set the base URL to your API endpoint (note the "/api" suffix)
const BASE_URL =
  import.meta.env.MODE === "development"
    ? "http://localhost:5001/api"
    : "/api";

// Create an Axios instance with withCredentials enabled
export const axiosInstance = axios.create({
  baseURL: BASE_URL,
  withCredentials: true, // ensures cookies are sent along with requests
});

export const useAuthStore = create((set, get) => ({
  authUser: null,
  isSigningUp: false,
  isLoggingIn: false,
  isUpdatingProfile: false,
  isCheckingAuth: true,
  onlineUsers: [],
  socket: null,

  checkAuth: async () => {
    try {
      const res = await axiosInstance.get("/auth/check");
      set({ authUser: res.data });
      get().connectSocket();
    } catch (error) {
      console.log("Error in checkAuth:", error.response?.data?.message || error.message);
      set({ authUser: null });
    } finally {
      set({ isCheckingAuth: false });
    }
  },

  signup: async (data) => {
    set({ isSigningUp: true });
    try {
      const res = await axiosInstance.post("/auth/signup", data);
      set({ authUser: res.data });
      toast.success("Account created successfully");
      get().connectSocket();
    } catch (error) {
      toast.error(error.response?.data?.message || "Signup failed");
    } finally {
      set({ isSigningUp: false });
    }
  },

  login: async (data) => {
    set({ isLoggingIn: true });
    try {
      const res = await axiosInstance.post("/auth/login", data);
      set({ authUser: res.data });
      toast.success("Logged in successfully");
      get().connectSocket();
    } catch (error) {
      toast.error(error.response?.data?.message || "Login failed");
    } finally {
      set({ isLoggingIn: false });
    }
  },

  logout: async () => {
    try {
      await axiosInstance.post("/auth/logout");
      set({ authUser: null });
      toast.success("Logged out successfully");
      get().disconnectSocket();
    } catch (error) {
      toast.error(error.response?.data?.message || "Logout failed");
    }
  },

  updateProfile: async (data) => {
    set({ isUpdatingProfile: true });
    try {
      // Validate base64 size
      const base64Size = (data.profilePic.length * 3) / 4 - 2;
      if (base64Size > 50 * 1024 * 1024) {
        throw new Error("Image exceeds 5MB limit");
      }
  
      const res = await axiosInstance.put("/auth/update-profile", data);
      
      set((state) => ({
        authUser: {
          ...state.authUser,
          profilePic: res.data.profilePic,
        },
      }));
      
      toast.success("Profile updated successfully");
    } catch (error) {
      console.error("Update Profile Error:", error);
      const message =
        error.response?.data?.message || error.message || "Failed to update profile";
      toast.error(message);
    } finally {
      set({ isUpdatingProfile: false });
    }
  },
  
  connectSocket: () => {
    const { authUser } = get();
    if (!authUser || get().socket?.connected) return;
    
    const socket = io("http://localhost:5001", {
      query: { userId: 2},
      transports: ["polling", "websocket"],
      withCredentials: true,
    });
    socket.connect();
    
    set({ socket });
    
    socket.on("getOnlineUsers", (userIds) => {
      set({ onlineUsers: userIds });
    });
  },
  
  disconnectSocket: () => {
    if (get().socket?.connected) get().socket.disconnect();
  },
}));
