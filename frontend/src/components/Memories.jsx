import { Link } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";
import { LogOut, MessageSquare, Settings, User } from "lucide-react";
import { useState, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import dayjs from "dayjs";
import axios from "axios"; // if needed for local usage
import { axiosInstance } from "../lib/axios.js"; // your configured axios
import { v4 as uuidv4 } from "uuid";

const Navbar = () => {
  const { logout, authUser } = useAuthStore();

  const Memories = () => {
    const [memories, setMemories] = useState([]);
    const [isUploading, setIsUploading] = useState(false);

    /* --------------------------------------------
       Convert a File into a Base64 Data URL
    -------------------------------------------- */
    const readFileAsBase64 = (file) => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    };

    /* --------------------------------------------
       Dropzone onDrop Handler
       1) Convert each file -> base64
       2) POST to /memories
       3) Add to local state or reload
    -------------------------------------------- */
    const onDrop = async (acceptedFiles) => {
      setIsUploading(true);
      try {
        const uploadedMemories = [];

        for (const file of acceptedFiles) {
          // 1) Convert file to base64
          const base64Data = await readFileAsBase64(file);
          // base64Data looks like "data:image/png;base64,iVBOR..."

          // 2) Decide memoryType (image or video)
          const memoryType = file.type.startsWith("video") ? "video" : "image";

          // 3) POST to backend
          const res = await axiosInstance.post("/memories", {
            memoryType,
            memoryBase64: base64Data.replace(/^data:.+;base64,/, ""), 
            // or you can store the entire data URL in DB
          });

          const newMemory = res.data; 
          // e.g. { memory_id, memory_type, memory_content, upload_date, ... }

          // 4) Transform the response into local state shape
          //    We assume `memory_content` is raw base64. Let's rebuild a data URL:
          let src = "";
          if (newMemory.memory_type === "image") {
            src = `data:image/png;base64,${newMemory.memory_content}`;
          } else if (newMemory.memory_type === "video") {
            src = `data:video/mp4;base64,${newMemory.memory_content}`;
          }

          uploadedMemories.push({
            id: newMemory.memory_id,
            src,
            name: file.name,
            type: newMemory.memory_type,
            date: dayjs(newMemory.upload_date).format("MMMM D, YYYY h:mm A"),
          });
        }

        // Update local state
        setMemories((prev) => [...prev, ...uploadedMemories]);
      } catch (error) {
        console.error("Upload failed:", error);
        alert(`Upload failed: ${error?.response?.data?.error || error.message}`);
      } finally {
        setIsUploading(false);
      }
    };

    // Setup dropzone
    const { getRootProps, getInputProps } = useDropzone({
      accept: {
        "image/*": [],
        "video/*": [],
      },
      onDrop,
    });

    /* --------------------------------------------
       Load memories from DB on mount
    -------------------------------------------- */
    const loadMemories = async () => {
      try {
        const { data } = await axiosInstance.get("/memories");
        // data is an array of DB rows: 
        // [ { memory_id, memory_type, memory_content, upload_date, ... }, ... ]

        // Transform them so each memory has a "src" we can display 
        const mapped = data.map((item) => {
          // If it's an image, build data URL
          // If it's a video, do similarly
          let src = "";
          if (item.memory_type === "image") {
            src = `data:image/png;base64,${item.memory_content}`;
          } else if (item.memory_type === "video") {
            src = `data:video/mp4;base64,${item.memory_content}`;
          }
          return {
            id: item.memory_id,
            src,
            name: `Memory #${item.memory_id}`,
            type: item.memory_type,
            date: dayjs(item.upload_date).format("MMMM D, YYYY h:mm A"),
          };
        });

        setMemories(mapped);
      } catch (error) {
        console.error("Failed to load memories:", error);
      }
    };

    useEffect(() => {
      loadMemories();
    }, []);

    return (
      <div className="container mx-auto p-4">
        <h1 className="text-3xl font-bold mb-6 text-center">Memories</h1>

        {/* Upload Section */}
        <div
          {...getRootProps()}
          className="border-4 border-dashed border-gray-300 p-8 rounded-lg cursor-pointer hover:bg-gray-100 transition text-center"
        >
          <input {...getInputProps()} />
          {isUploading ? (
            <p className="text-gray-500 text-lg">Uploading...</p>
          ) : (
            <p className="text-gray-500 text-lg">
              Drag & drop your images or videos here, or click to select
            </p>
          )}
        </div>

        {/* Display Memories */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {memories.map((memory) => (
            <div
              key={memory.id}
              className="relative shadow-lg rounded-lg overflow-hidden group bg-gray-50"
            >
              {memory.type === "image" ? (
                <img
                  src={memory.src}
                  alt="memory"
                  className="w-full h-48 object-cover transition-transform transform group-hover:scale-105"
                />
              ) : (
                <video className="w-full h-48" controls>
                  <source src={memory.src} type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
              )}

              {/* Hover Effects */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex justify-center items-center">
                <div className="absolute top-2 right-2 flex gap-2">
                  {/* Download Button */}
                  <button
                    onClick={() => {
                      const link = document.createElement("a");
                      link.href = memory.src;
                      link.download = memory.name;
                      link.click();
                    }}
                    className="bg-blue-500 text-white p-2 rounded-full hover:bg-blue-600 transition"
                  >
                    <span className="material-icons text-white">download</span>
                  </button>
                  {/* Share Button */}
                  {navigator.share && (
                    <button
                      onClick={() =>
                        navigator.share({
                          title: "Memory",
                          text: "Check out this memory!",
                          url: memory.src,
                        })
                      }
                      className="bg-green-500 text-white p-2 rounded-full hover:bg-green-600 transition"
                    >
                      <span className="material-icons text-white">share</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <header
      className="bg-base-100 border-b border-base-300 fixed w-full top-0 z-40 
      backdrop-blur-lg bg-base-100/80"
    >
      <div className="container mx-auto px-4 h-16">
        <div className="flex items-center justify-between h-full">
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2.5 hover:opacity-80 transition-all">
              <div className="size-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-primary" />
              </div>
              <h1 className="text-lg font-bold">TimeCapsule</h1>
            </Link>

            {/* New Memories Tab */}
            <Link to="/memories" className="hover:opacity-80 transition-all text-lg font-bold">
              Memories
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <Link to={"/settings"} className="btn btn-sm gap-2 transition-colors">
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Settings</span>
            </Link>

            {authUser && (
              <>
                <Link to={"/profile"} className="btn btn-sm gap-2">
                  <User className="size-5" />
                  <span className="hidden sm:inline">Profile</span>
                </Link>

                <button className="flex gap-2 items-center" onClick={logout}>
                  <LogOut className="size-5" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Memories Component */}
      <Memories />
    </header>
  );
};

export default Navbar;
