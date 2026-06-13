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
      if (!video) return;
      if (Math.abs(video.currentTime - time) > 1) {
        video.currentTime = time;
      }
      setIsSyncing(true);
      video.play().catch(console.error).finally(() => setIsSyncing(false));
    };

    const handlePause = ({ time }: { time: number }) => {
      if (!video) return;
      video.currentTime = time;
      setIsSyncing(true);
      video.pause();
      setIsSyncing(false);
    };

    const handleSeek = ({ time }: { time: number }) => {
      if (!video) return;
      setIsSyncing(true);
      video.currentTime = time;
      setIsSyncing(false);
    };

    const handleSyncState = (state: { timestamp: number, playing: boolean, url: string }) => {
      if (!video) return;
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
      socket.off('change_video');
    };
  }, [socket, isHost, videoUrl]);

  // Listen for video URL changes from host
  useEffect(() => {
    if (!socket) return;
    const handleChangeVideo = ({ url }: { url: string }) => {
      setVideoUrl(url);
    };
    socket.on('change_video', handleChangeVideo);
    return () => {
      socket.off('change_video', handleChangeVideo);
    };
  }, [socket]);

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

  const handleVideoUrlChange = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newUrl = formData.get('videoUrl') as string;
    if (newUrl && socket && isHost) {
      setVideoUrl(newUrl);
      socket.emit('change_video', { roomId, url: newUrl });
    }
  };

  return (
    <div className="flex flex-col gap-4 w-full">
      {isHost && (
        <form onSubmit={handleVideoUrlChange} className="flex gap-2">
          <input
            name="videoUrl"
            type="url"
            defaultValue={videoUrl}
            placeholder="Enter MP4 video URL..."
            className="flex-1 bg-neutral-800 border border-neutral-700 rounded-lg py-2 px-3 text-sm text-white"
          />
          <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium">
            Load Video
          </button>
        </form>
      )}
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
    </div>
  );
}
