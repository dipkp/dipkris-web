"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { io, Socket } from "socket.io-client";
import { useRoomStore } from "@/store/useRoomStore";
import VideoPlayer from "@/components/VideoPlayer";
import { Users, Crown, Copy, Check } from "lucide-react";

export default function RoomPage() {
  const params = useParams();
  const roomId = params.roomId as string;
  const [socket, setSocket] = useState<Socket | null>(null);
  const [copied, setCopied] = useState(false);
  
  const {
    userId, setUserId, isHost, setIsHost,
    users, addUser, removeUser, setRoomId
  } = useRoomStore();

  useEffect(() => {
    // Generate a temporary user ID for this session if we don't have one
    const currentUserId = userId || `user_${Math.random().toString(36).substring(2, 8)}`;
    if (!userId) setUserId(currentUserId);
    setRoomId(roomId);

    // Connect to the socket server
    const socketHost = process.env.NEXT_PUBLIC_SOCKET_HOST;
    let socketUrl = "http://localhost:4000";
    if (socketHost) {
      socketUrl = `https://${socketHost}`;
    } else if (typeof window !== "undefined") {
      socketUrl = `http://${window.location.hostname}:4000`;
    }
    const socketInstance = io(socketUrl);
    setSocket(socketInstance);

    socketInstance.on("connect", () => {
      console.log("Connected to server");
      socketInstance.emit("join_room", { roomId, userId: currentUserId });
    });

    socketInstance.on("room_joined", ({ isHost: serverIsHost }) => {
      setIsHost(serverIsHost);
    });

    socketInstance.on("is_host", (newIsHost: boolean) => {
      setIsHost(newIsHost);
    });

    socketInstance.on("user_joined", ({ userId: joinedId, socketId }) => {
      addUser({ userId: joinedId, socketId });
    });

    socketInstance.on("user_left", ({ socketId }) => {
      removeUser(socketId);
    });

    return () => {
      socketInstance.disconnect();
    };
  }, [roomId]);

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex flex-col md:flex-row">
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col p-4 gap-4">
        {/* Header (Below video on mobile, above on desktop) */}
        <header className="order-2 md:order-1 bg-neutral-900 border border-neutral-800 rounded-xl p-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              Room: <span className="font-mono text-blue-400">{roomId}</span>
              {isHost && <Crown size={18} className="text-yellow-500 ml-2" />}
            </h1>
          </div>
          <button 
            onClick={copyLink}
            className="flex items-center gap-2 bg-neutral-800 hover:bg-neutral-700 px-4 py-2 rounded-lg transition-colors text-sm font-medium"
          >
            {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
            {copied ? "Copied!" : "Copy Link"}
          </button>
        </header>

        {/* Video Player Area (Top on mobile, below header on desktop) */}
        <div className="order-1 md:order-2 flex-1 flex flex-col justify-center max-w-5xl mx-auto w-full">
          <VideoPlayer socket={socket} roomId={roomId} isHost={isHost} />
          
          <div className="mt-4 text-neutral-400 text-sm">
            <p>
              {isHost ? (
                "You are the Host. Your playback controls sync for everyone in the room."
              ) : (
                "You are a Viewer. The Host controls the synchronized playback."
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Sidebar (Chat / Users) */}
      <div className="w-full md:w-80 bg-neutral-900 border-l border-neutral-800 flex flex-col">
        <div className="p-4 border-b border-neutral-800 flex items-center gap-2">
          <Users size={20} className="text-blue-500" />
          <h2 className="font-semibold">Participants ({users.length + 1})</h2>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
          {/* Self */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center font-semibold text-xs">
              {userId?.substring(5, 7).toUpperCase()}
            </div>
            <div className="flex-1 truncate">
              <span className="font-medium text-sm">You</span>
            </div>
            {isHost && <Crown size={14} className="text-yellow-500" />}
          </div>
          
          {/* Others */}
          {users.map(u => (
            <div key={u.socketId} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-neutral-700 flex items-center justify-center font-semibold text-xs text-neutral-300">
                {u.userId?.substring(5, 7).toUpperCase()}
              </div>
              <div className="flex-1 truncate text-sm text-neutral-300">
                <span>{u.userId}</span>
              </div>
            </div>
          ))}
        </div>
        
        {/* Placeholder for Chat */}
        <div className="h-64 border-t border-neutral-800 p-4 flex flex-col">
          <div className="flex-1 overflow-y-auto text-neutral-500 text-xs text-center flex items-center justify-center">
            Chat & Danmaku ribbon coming soon...
          </div>
          <div className="mt-2 relative">
            <input 
              type="text" 
              disabled
              placeholder="Type a message..." 
              className="w-full bg-neutral-800 border border-neutral-700 rounded-lg py-2 px-3 text-sm opacity-50 cursor-not-allowed"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
