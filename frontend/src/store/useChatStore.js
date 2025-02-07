import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";

export const useChatStore = create((set, get) => ({
  messages: [],
  users: [],
  selectedUser: null,
  isUsersLoading: false,
  isMessagesLoading: false,

  // Fetch all users for the chat sidebar (excluding the current user)
  getUsers: async () => {
    set({ isUsersLoading: true });
    try {
      const res = await axiosInstance.get("/messages/users");
      set({ users: res.data });
    } catch (error) {
      toast.error(
        error?.response?.data?.message || "Failed to fetch users"
      );
    } finally {
      set({ isUsersLoading: false });
    }
  },

  // Fetch messages for the selected user
  getMessages: async (userId) => {
    set({ isMessagesLoading: true });
    try {
      const res = await axiosInstance.get(`/messages/${userId}`);
      set({ messages: res.data });
    } catch (error) {
      toast.error(
        error?.response?.data?.message || "Failed to fetch messages"
      );
    } finally {
      set({ isMessagesLoading: false });
    }
  },

  // Send a message (text and/or single image in base64 format)
  sendMessage: async (messageData) => {
    const { selectedUser, messages } = get();
    if (!selectedUser?._id) {
      toast.error("No user selected");
      return;
    }
    try {
      const res = await axiosInstance.post(
        `/messages/send/${selectedUser._id}`,
        messageData
      );
      set({ messages: [...messages, res.data] });
    } catch (error) {
      toast.error(
        error?.response?.data?.message || "Failed to send message"
      );
    }
  },

  // Send a message with multiple images (expects messageData.images to be an array of base64 strings)
  sendMessageWithImages: async (messageData = {}) => {
    const { selectedUser, messages } = get();
    if (!selectedUser?._id) {
      toast.error("No user selected");
      return;
    }
    try {
      if (!Array.isArray(messageData.images)) {
        messageData.images = [];
      }
      const res = await axiosInstance.post(
        `/messages/send/${selectedUser._id}`,
        messageData
      );
      set({ messages: [...messages, res.data] });
    } catch (error) {
      toast.error(
        error?.response?.data?.message || "Failed to send message"
      );
    }
  },

  // Subscribe to incoming Socket.io messages
  subscribeToMessages: () => {
    const { selectedUser } = get();
    if (!selectedUser) return;
    const socket = useAuthStore.getState().socket;
    if (!socket) return;
    socket.on("newMessage", (newMessage) => {
      // Update state only if the new message is for the currently selected user
      const isMessageForSelectedUser =
        newMessage.senderId === selectedUser._id ||
        newMessage.receiverId === selectedUser._id;
      if (!isMessageForSelectedUser) return;
      set({ messages: [...get().messages, newMessage] });
    });
  },

  // Unsubscribe from incoming Socket.io messages
  unsubscribeFromMessages: () => {
    const socket = useAuthStore.getState().socket;
    if (socket) {
      socket.off("newMessage");
    }
  },

  // Set the currently selected user for the chat
  setSelectedUser: (selectedUser) => set({ selectedUser }),
}));
