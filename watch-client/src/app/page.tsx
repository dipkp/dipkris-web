"use client";

import { useRouter } from "next/navigation";
import { Tv } from "lucide-react";

export default function Home() {
  const router = useRouter();

  const handleCreateRoom = () => {
    // Generate a random room ID (e.g., 6 alphanumeric characters)
    const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    router.push(`/room/${roomId}`);
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-neutral-900 border border-neutral-800 rounded-2xl p-8 text-center shadow-2xl">
        <div className="w-16 h-16 bg-blue-500/20 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-6">
          <Tv size={32} />
        </div>
        <h1 className="text-3xl font-bold mb-2">Watch Party</h1>
        <p className="text-neutral-400 mb-8">
          Create a frictionless room, share the link, and watch videos in perfect sync with your friends.
        </p>
        
        <button
          onClick={handleCreateRoom}
          className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          Create Room
        </button>
      </div>
    </div>
  );
}
