"use client";

import { useEffect, useRef, useState } from "react";
import { Socket } from "socket.io-client";

interface VideoPlayerProps {
  socket: Socket | null;
  roomId: string;
  isHost: boolean;
}

export default function VideoPlayer({ socket, roomId, isHost }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoUrl, setVideoUrl] = useState("https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4");
  const [isSyncing, setIsSyncing] = useState(false);

  // Sync state FROM the server
  useEffect(() => {
    if (!socket || !videoRef.current) return;

    const video = videoRef.current;

    const handlePlay = ({ time }: { time: number }) => {
      if (Math.abs(video.currentTime - time) > 1) {
        video.currentTime = time;
      }
      setIsSyncing(true);
      video.play().catch(console.error).finally(() => setIsSyncing(false));
    };

    const handlePause = ({ time }: { time: number }) => {
      video.currentTime = time;
      setIsSyncing(true);
      video.pause();
      setIsSyncing(false);
    };

    const handleSeek = ({ time }: { time: number }) => {
      setIsSyncing(true);
      video.currentTime = time;
      setIsSyncing(false);
    };

    const handleSyncState = (state: { timestamp: number, playing: boolean, url: string }) => {
      setVideoUrl(state.url);
      video.currentTime = state.timestamp;
      if (state.playing) {
        setIsSyncing(true);
        video.play().catch(console.error).finally(() => setIsSyncing(false));
      } else {
        setIsSyncing(true);
        video.pause();
        setIsSyncing(false);
      }
    };

    socket.on('play_video', handlePlay);
    socket.on('pause_video', handlePause);
    socket.on('seek_video', handleSeek);
    socket.on('sync_state', handleSyncState);

    // If host is asked to provide state to a new user
    socket.on('request_sync', ({ targetSocketId }) => {
      if (!isHost) return;
      socket.emit('send_sync', {
        targetSocketId,
        state: {
          timestamp: video.currentTime,
          playing: !video.paused,
          url: videoUrl
        }
      });
    });

    return () => {
      socket.off('play_video', handlePlay);
      socket.off('pause_video', handlePause);
      socket.off('seek_video', handleSeek);
      socket.off('sync_state', handleSyncState);
      socket.off('request_sync');
    };
  }, [socket, isHost, videoUrl]);

  // Sync state TO the server (Local DOM events)
  const onPlay = () => {
    if (isSyncing || !socket) return;
    socket.emit('play_video', { roomId, time: videoRef.current?.currentTime || 0 });
  };

  const onPause = () => {
    if (isSyncing || !socket) return;
    socket.emit('pause_video', { roomId, time: videoRef.current?.currentTime || 0 });
  };

  const onSeeked = () => {
    if (isSyncing || !socket) return;
    socket.emit('seek_video', { roomId, time: videoRef.current?.currentTime || 0 });
  };

  return (
    <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden border border-neutral-800 shadow-xl">
      <video
        ref={videoRef}
        src={videoUrl}
        controls
        className="w-full h-full"
        onPlay={onPlay}
        onPause={onPause}
        onSeeked={onSeeked}
      />
    </div>
  );
}
