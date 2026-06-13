"use client";

import { useEffect, useRef, useState } from "react";
import { Socket } from "socket.io-client";
import { useWebRTC } from "@/hooks/useWebRTC";
import { MonitorUp, FileVideo } from "lucide-react";
import DanmakuOverlay from "./DanmakuOverlay";

interface VideoPlayerProps {
  socket: Socket | null;
  roomId: string;
  isHost: boolean;
}

export default function VideoPlayer({ socket, roomId, isHost }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoUrl, setVideoUrl] = useState("https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4");
  const [isSyncing, setIsSyncing] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const { remoteStreams } = useWebRTC(socket, localStream);

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

  // Handle incoming remote WebRTC streams (for viewers)
  useEffect(() => {
    if (isHost || !videoRef.current) return;
    
    // Get the first remote stream (assuming it's from the host)
    const stream = Array.from(remoteStreams.values())[0];
    if (stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.src = "";
      videoRef.current.play().catch(e => console.error("Auto-play blocked:", e));
    } else {
      videoRef.current.srcObject = null;
      videoRef.current.src = videoUrl;
    }
  }, [remoteStreams, isHost, videoUrl]);

  // Sync state TO the server (Local DOM events)
  const onPlay = () => {
    if (isSyncing || !socket || isStreaming) return;
    socket.emit('play_video', { roomId, time: videoRef.current?.currentTime || 0 });
  };

  const onPause = () => {
    if (isSyncing || !socket || isStreaming) return;
    socket.emit('pause_video', { roomId, time: videoRef.current?.currentTime || 0 });
  };

  const onSeeked = () => {
    if (isSyncing || !socket || isStreaming) return;
    socket.emit('seek_video', { roomId, time: videoRef.current?.currentTime || 0 });
  };

  const handleVideoUrlChange = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newUrl = formData.get('videoUrl') as string;
    if (newUrl && socket && isHost) {
      setVideoUrl(newUrl);
      setIsStreaming(false);
      if (videoRef.current) videoRef.current.srcObject = null;
      socket.emit('change_video', { roomId, url: newUrl });
    }
  };

  const handleShareScreen = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.src = "";
        videoRef.current.play();
      }
      setLocalStream(stream);
      setIsStreaming(true);
      socket?.emit('change_video', { roomId, url: "LIVE_STREAM" });

      stream.getVideoTracks()[0].onended = () => {
        setIsStreaming(false);
        setLocalStream(null);
        if (videoRef.current) {
          videoRef.current.srcObject = null;
          videoRef.current.src = videoUrl;
        }
      };
    } catch (err) {
      console.error("Failed to share screen:", err);
    }
  };

  const handleLocalFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !videoRef.current || !socket) return;

    setIsUploading(true);
    
    // Determine the backend upload URL dynamically based on the socket URL
    const backendUrl = socket.io.uri.replace(/\/$/, "");
    
    const formData = new FormData();
    formData.append("video", file);

    try {
      const response = await fetch(`${backendUrl}/upload`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const data = await response.json();
      const publicUrl = data.url;

      setVideoUrl(publicUrl);
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      setIsStreaming(false); // It's no longer a live stream, it's a synced video URL
      socket.emit('change_video', { roomId, url: publicUrl });

    } catch (err) {
      console.error("Error uploading local file:", err);
      alert("Failed to upload the local file. Please try again or use a smaller file.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 w-full">
      {isHost && (
        <div className="flex flex-col gap-3">
          <form onSubmit={handleVideoUrlChange} className="flex gap-2">
            <input
              name="videoUrl"
              type="url"
              defaultValue={videoUrl}
              placeholder="Enter MP4 video URL..."
              className="flex-1 bg-neutral-800 border border-neutral-700 rounded-lg py-2 px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
              Load Video
            </button>
          </form>
          
          <div className="flex gap-2">
            <button 
              onClick={handleShareScreen}
              className="flex-1 bg-neutral-800 border border-neutral-700 hover:bg-neutral-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors"
            >
              <MonitorUp size={16} />
              Share Screen
            </button>
            <div className="flex-1 relative">
              <input 
                type="file" 
                accept="video/*"
                onChange={handleLocalFile}
                className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
              />
              <button 
                disabled={isUploading}
                className={`w-full ${isUploading ? 'bg-neutral-600 cursor-not-allowed' : 'bg-neutral-800 hover:bg-neutral-700'} border border-neutral-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors`}
              >
                {isUploading ? (
                  <span className="animate-pulse">Uploading...</span>
                ) : (
                  <>
                    <FileVideo size={16} />
                    Play Local File
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden border border-neutral-800 shadow-xl group">
        <video
          ref={videoRef}
          src={videoUrl}
          controls
          playsInline
          className="w-full h-full"
          onPlay={onPlay}
          onPause={onPause}
          onSeeked={onSeeked}
          autoPlay={isStreaming || !isHost}
        />
        <DanmakuOverlay />
        {isStreaming && isHost && (
          <div className="absolute top-4 left-4 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded animate-pulse">
            LIVE
          </div>
        )}
      </div>
    </div>
  );
}
