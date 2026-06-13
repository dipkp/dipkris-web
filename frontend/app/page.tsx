'use client';

import { nanoid } from 'nanoid';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  const createRoom = () => {
    const roomId = nanoid(10);
    router.push(`/room/${roomId}`);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-950 text-white p-4">
      <div className="text-center max-w-lg p-10 bg-gray-900 rounded-3xl shadow-2xl border border-gray-800">
        <h1 className="text-5xl font-extrabold mb-6 text-transparent bg-clip-text bg-gradient-to-br from-blue-400 to-purple-500">
          Watch Party
        </h1>
        <p className="text-gray-400 mb-10 text-lg leading-relaxed">
          Frictionless, real-time synchronized video playback and video chat. No signup required.
        </p>
        <button 
          onClick={createRoom}
          className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 rounded-full font-bold text-xl transition-all shadow-lg hover:shadow-blue-500/25 active:scale-95"
        >
          Create Room Now
        </button>
      </div>
    </div>
  );
}
