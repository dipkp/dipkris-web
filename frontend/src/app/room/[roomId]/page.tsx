"use client";

import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { useParams } from "next/navigation";

// Video source to use for testing
const VIDEO_SRC = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";

export default function RoomPage() {
  const params = useParams();
  const roomId = params?.roomId as string;

  const videoRef = useRef<HTMLVideoElement>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  
  // To prevent infinite loops of syncing
  const isSeekingRef = useRef(false);
  const ignoreNextPlayPause = useRef(false);

  useEffect(() => {
    if (!roomId) return;

    // Connect to the backend server
    const newSocket = io("http://localhost:3001");
    setSocket(newSocket);

    newSocket.on("connect", () => {
      setIsConnected(true);
      newSocket.emit("join_room", { roomId });
    });

    newSocket.on("user_joined", ({ userId }) => {
      console.log(`User ${userId} joined the room`);
    });

    // When someone else joins and we are the host, they will ask for sync
    newSocket.on("request_sync", ({ requestingUserId }) => {
      if (videoRef.current) {
        newSocket.emit("sync_state", {
          roomId,
          time: videoRef.current.currentTime,
          playing: !videoRef.current.paused,
          requestingUserId,
        });
      }
    });

    // When we join and get the state from the host
    newSocket.on("sync_state", ({ time, playing }) => {
      if (videoRef.current) {
        ignoreNextPlayPause.current = true;
        isSeekingRef.current = true;
        videoRef.current.currentTime = time;
        if (playing) {
          videoRef.current.play().catch(console.error);
        } else {
          videoRef.current.pause();
        }
        setTimeout(() => {
          isSeekingRef.current = false;
        }, 500);
      }
    });

    newSocket.on("play", ({ time }) => {
      if (videoRef.current) {
        ignoreNextPlayPause.current = true;
        videoRef.current.currentTime = time;
        videoRef.current.play().catch(console.error);
      }
    });

    newSocket.on("pause", ({ time }) => {
      if (videoRef.current) {
        ignoreNextPlayPause.current = true;
        videoRef.current.currentTime = time;
        videoRef.current.pause();
      }
    });

    newSocket.on("seek", ({ time }) => {
      if (videoRef.current) {
        isSeekingRef.current = true;
        videoRef.current.currentTime = time;
        setTimeout(() => {
          isSeekingRef.current = false;
        }, 500);
      }
    });

    return () => {
      newSocket.disconnect();
    };
  }, [roomId]);

  // Video Event Handlers
  const handlePlay = () => {
    if (ignoreNextPlayPause.current) {
      ignoreNextPlayPause.current = false;
      return;
    }
    if (socket && videoRef.current) {
      socket.emit("play", { roomId, time: videoRef.current.currentTime });
    }
  };

  const handlePause = () => {
    if (ignoreNextPlayPause.current) {
      ignoreNextPlayPause.current = false;
      return;
    }
    if (socket && videoRef.current) {
      socket.emit("pause", { roomId, time: videoRef.current.currentTime });
    }
  };

  const handleSeeked = () => {
    if (isSeekingRef.current) {
      // Ignore programmatic seeks
      return;
    }
    if (socket && videoRef.current) {
      socket.emit("seek", { roomId, time: videoRef.current.currentTime });
    }
  };

  if (!roomId) return null;

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      {/* Header */}
      <header className="p-4 bg-gray-900 border-b border-gray-800 flex justify-between items-center z-10 relative shadow-md">
        <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
          Room: {roomId}
        </h1>
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span className="text-sm text-gray-400">{isConnected ? 'Connected' : 'Connecting...'}</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 relative overflow-hidden flex items-center justify-center bg-black">
        {/* Video Player */}
        <div className="relative w-full max-w-5xl aspect-video shadow-2xl ring-1 ring-gray-800 rounded-lg overflow-hidden">
          <video
            ref={videoRef}
            src={VIDEO_SRC}
            controls
            className="w-full h-full object-contain bg-black"
            onPlay={handlePlay}
            onPause={handlePause}
            onSeeked={handleSeeked}
          />
          
          {/* Danmaku Overlay Container (Future implementation) */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {/* Example of a scrolling ribbon message */}
            <div className="absolute top-10 w-full animate-[danmaku_8s_linear_infinite] whitespace-nowrap opacity-90 drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] text-xl font-bold text-white tracking-wide">
              Welcome to Kosmi + Rave!
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
