'use client';

import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import VideoPlayer from '@/components/VideoPlayer';
import { useWebRTC } from '@/hooks/useWebRTC';
import { VideoBox } from '@/components/VideoBox';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000';

export default function RoomPage({ params }: { params: { roomId: string } }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [connected, setConnected] = useState(false);
  
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [mediaRequested, setMediaRequested] = useState(false);

  useEffect(() => {
    // 1. Get media first so WebRTC gets it seamlessly before signaling
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then((stream) => setLocalStream(stream))
      .catch((err) => console.warn('Could not get media:', err))
      .finally(() => {
        setMediaRequested(true);
      });
  }, []);

  useEffect(() => {
    if (!mediaRequested) return;

    // 2. Connect socket
    const s = io(SOCKET_URL);
    setSocket(s);

    s.on('connect', () => {
      setConnected(true);
      s.emit('join-room', params.roomId);
    });

    s.on('room-state', (state) => {
      setIsHost(state.hostId === s.id);
    });

    s.on('new-host', (newHostId) => {
      setIsHost(newHostId === s.id);
    });

    return () => {
      s.disconnect();
    };
  }, [mediaRequested, params.roomId]);

  // 3. Init WebRTC Mesh
  const { remoteStreams } = useWebRTC(socket, localStream, params.roomId);

  if (!connected) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center text-white">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-gray-400 animate-pulse">Connecting to server...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <header className="mb-10 text-center">
        <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600 mb-2">
          Room: {params.roomId}
        </h1>
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gray-900 border border-gray-800">
          <div className={`w-2 h-2 rounded-full ${isHost ? 'bg-blue-500' : 'bg-gray-500'}`}></div>
          <span className="text-sm font-medium text-gray-300">
            {isHost ? 'You are the Host (You control playback)' : 'You are a Guest (The Host controls playback)'}
          </span>
        </div>
      </header>

      <main className="max-w-7xl mx-auto flex flex-col gap-12">
        <VideoPlayer socket={socket} roomId={params.roomId} isHost={isHost} />
        
        <section>
          <h2 className="text-2xl font-bold text-gray-200 mb-6 border-b border-gray-800 pb-2">Participants ({remoteStreams.length + (localStream ? 1 : 0)})</h2>
          <div id="webrtc-container" className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {localStream && <VideoBox stream={localStream} isLocal={true} />}
            {remoteStreams.map((rs) => (
              <VideoBox key={rs.peerId} stream={rs.stream} />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
