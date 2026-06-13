'use client';

import { useEffect, useRef, useState } from 'react';
import { Socket } from 'socket.io-client';
import { DanmakuOverlay } from './DanmakuOverlay';

interface VideoPlayerProps {
  socket: Socket | null;
  roomId: string;
  isHost: boolean;
}

export default function VideoPlayer({ socket, roomId, isHost }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoUrl, setVideoUrl] = useState('');
  
  const isSyncing = useRef(false);

  useEffect(() => {
    if (!socket) return;

    socket.on('SYNC_STATE', (state) => {
      isSyncing.current = true;
      if (videoUrl !== state.videoUrl && state.videoUrl) {
        setVideoUrl(state.videoUrl);
      }
      
      const video = videoRef.current;
      if (video) {
        if (Math.abs(video.currentTime - state.timestamp) > 1) {
          video.currentTime = state.timestamp;
        }
        
        if (state.isPlaying && video.paused) {
          video.play().catch(e => console.error(e));
        } else if (!state.isPlaying && !video.paused) {
          video.pause();
        }
      }
      
      setTimeout(() => {
        isSyncing.current = false;
      }, 100);
    });

    return () => {
      socket.off('SYNC_STATE');
    };
  }, [socket, videoUrl]);

  const handlePlay = () => {
    if (!isHost || isSyncing.current) return;
    if (socket && videoRef.current) {
      socket.emit('sync-state', {
        roomId,
        isPlaying: true,
        timestamp: videoRef.current.currentTime
      });
    }
  };

  const handlePause = () => {
    if (!isHost || isSyncing.current) return;
    if (socket && videoRef.current) {
      socket.emit('sync-state', {
        roomId,
        isPlaying: false,
        timestamp: videoRef.current.currentTime
      });
    }
  };

  const handleSeek = () => {
    if (!isHost || isSyncing.current) return;
    if (socket && videoRef.current) {
      socket.emit('sync-state', {
        roomId,
        isPlaying: !videoRef.current.paused,
        timestamp: videoRef.current.currentTime
      });
    }
  };

  const loadVideo = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const url = new FormData(e.currentTarget).get('url') as string;
    if (url && socket && isHost) {
      socket.emit('sync-state', {
        roomId,
        videoUrl: url,
        isPlaying: false,
        timestamp: 0
      });
    }
  };

  const sendChat = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const text = new FormData(form).get('chat') as string;
    if (text && socket) {
      socket.emit('chat-message', { roomId, text });
      form.reset();
    }
  };

  return (
    <div className="w-full flex flex-col items-center">
      {isHost && (
        <form onSubmit={loadVideo} className="mb-6 flex w-full max-w-2xl gap-3">
          <input 
            type="url" 
            name="url" 
            placeholder="Enter Video URL (.mp4, etc.)" 
            className="flex-1 p-3 border border-gray-700 rounded-xl bg-gray-800 text-white focus:outline-none focus:border-blue-500 transition-colors"
          />
          <button type="submit" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 px-6 py-3 rounded-xl text-white font-semibold shadow-lg transition-transform active:scale-95">
            Load Video
          </button>
        </form>
      )}

      <div className="relative w-full max-w-5xl aspect-video bg-black rounded-2xl overflow-hidden border border-gray-800 shadow-2xl">
        <video
          ref={videoRef}
          src={videoUrl}
          controls={isHost}
          onPlay={handlePlay}
          onPause={handlePause}
          onSeeked={handleSeek}
          className="w-full h-full object-contain"
        />
        {!isHost && (
          <div className="absolute inset-0 z-10 pointer-events-auto" onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}>
          </div>
        )}
        
        {/* Rave Danmaku Chat Overlay */}
        <DanmakuOverlay socket={socket} roomId={roomId} />
      </div>

      <form onSubmit={sendChat} className="w-full max-w-5xl mt-6 flex gap-3">
        <input 
          type="text" 
          name="chat" 
          placeholder="Type a message to slide across the video..." 
          className="flex-1 p-4 border border-gray-700 rounded-xl bg-gray-800 text-white focus:outline-none focus:border-pink-500 transition-colors shadow-inner"
          autoComplete="off"
        />
        <button type="submit" className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 px-8 py-4 rounded-xl text-white font-bold shadow-lg transition-transform active:scale-95">
          Send
        </button>
      </form>
    </div>
  );
}
