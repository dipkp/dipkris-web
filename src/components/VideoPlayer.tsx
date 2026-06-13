import { useRef, useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRoom } from "@/store/RoomContext";
import SpinningLogo from "@/components/SpinningLogo";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Maximize,
  Camera,
  RotateCcw,
  Upload,
  Link,
  Loader2,
  AlertTriangle,
  MonitorUp,
  MonitorX,
  Activity,
  Subtitles,
  TextQuote,
} from "lucide-react";

import { isYouTubeUrl } from "@/lib/utils";
import { useScreenShare } from "@/hooks/useScreenShare";

// Helper: extract YouTube video ID from any YouTube URL format
function getYouTubeEmbedUrl(url: string): string | null {
  let videoId: string | null = null;

  if (url.includes("youtube.com/watch")) {
    try {
      videoId = new URL(url).searchParams.get("v");
    } catch {
      const match = url.match(/[?&]v=([^&]+)/);
      videoId = match ? match[1] : null;
    }
  } else if (url.includes("youtu.be/")) {
    videoId = url.split("youtu.be/")[1]?.split(/[?#]/)[0] || null;
  } else if (url.includes("youtube.com/embed/")) {
    videoId = url.split("youtube.com/embed/")[1]?.split(/[?#]/)[0] || null;
  }

  if (!videoId) return null;
  return `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`;
}

// Helper: convert SRT format to VTT format (browsers only support VTT)
function srtToVtt(srt: string): string {
  let vtt = "WEBVTT\n\n";
  vtt += srt
    .replace(/\r\n|\r/g, "\n")
    .replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, "$1.$2")
    .replace(/^[0-9]+\n/gm, "");
  return vtt;
}

function LiveChatStrip() {
  const { state } = useRoom();
  const [latestMessage, setLatestMessage] = useState<any>(null);

  useEffect(() => {
    const chatMsgs = state.messages.filter((m) => m.type === "chat" || m.type === "reaction");
    if (chatMsgs.length > 0) {
      const msg = chatMsgs[chatMsgs.length - 1];
      setLatestMessage(msg);
      const timer = setTimeout(() => setLatestMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [state.messages]);

  return (
    <AnimatePresence>
      {latestMessage && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          className="absolute top-6 left-1/2 -translate-x-1/2 z-40 max-w-[80%] pointer-events-none"
        >
          <div className="bg-black/60 backdrop-blur-xl border border-white/10 px-5 py-2.5 rounded-full shadow-2xl flex items-center gap-3">
            <span className="text-[var(--ios-blue)] font-bold text-[11px] uppercase tracking-wider whitespace-nowrap">
              {latestMessage.senderName}
            </span>
            <span className="text-white text-sm font-medium line-clamp-2">
              {latestMessage.content}
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function VideoPlayer() {
  const { state, dispatch, videoRef, wsRef } = useRoom();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [isLooping, setIsLooping] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [buffered, setBuffered] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [showBigPlay, setShowBigPlay] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dropActive, setDropActive] = useState(false);
  const [subtitleUrl, setSubtitleUrl] = useState<string | null>(null);
  const [subtitlesEnabled, setSubtitlesEnabled] = useState(true);

  const controlsTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const { isSharing, startShare, stopShare, localStream, remoteStream } = useScreenShare();
  const screenVideoRef = useRef<HTMLVideoElement>(null);

  // Attach WebRTC stream to video element
  useEffect(() => {
    if (screenVideoRef.current && (remoteStream || localStream)) {
      screenVideoRef.current.srcObject = remoteStream || localStream;
      screenVideoRef.current.play().catch(e => console.error(e));
    }
  }, [remoteStream, localStream]);

  const video = videoRef.current;

  const isYT = state.currentVideo ? isYouTubeUrl(state.currentVideo) : false;

  // Video source handler — only for non-YouTube videos
  useEffect(() => {
    if (!state.currentVideo || isYouTubeUrl(state.currentVideo)) return;
    if (!videoRef.current) return;

    const src = state.currentVideo;
    const videoEl = videoRef.current;

    setError(null);

    // ── Blob URLs (local files) — play INSTANTLY ──
    if (src.startsWith("blob:")) {
      videoEl.src = src;
      videoEl.load();
      videoEl.play().catch(() => {});
      return;
    }

    setIsLoading(true);

    // ── Regular URLs (mp4, webm, YouTube direct, etc.) ──
    videoEl.src = src;
    videoEl.load();
    setIsLoading(false);
  }, [state.currentVideo]);

  // Video event listeners — only for non-YouTube
  useEffect(() => {
    if (!video || isYT) return;

    const onPlay = () => {
      setIsPlaying(true);
      setShowBigPlay(false);
      dispatch({ type: "SET_PLAYING", playing: true });
    };
    const onPause = () => {
      setIsPlaying(false);
      dispatch({ type: "SET_PLAYING", playing: false });
    };
    const onTimeUpdate = () => {
      if (!isDragging) setCurrentTime(video.currentTime);
    };
    const onDurationChange = () => setDuration(video.duration || 0);
    const onProgress = () => {
      if (video.buffered.length > 0) {
        setBuffered(video.buffered.end(video.buffered.length - 1));
      }
    };
    const onWaiting = () => setIsLoading(true);
    const onCanPlay = () => setIsLoading(false);
    const onEnded = () => setIsPlaying(false);
    const onError = () => {
      // Only show error if we actually have a video source set
      if (state.currentVideo) {
        setIsLoading(false);
        setError(
          "This video format or codec isn't supported by your browser.\n\n" +
          "Try one of these:\n" +
          "• Convert to MP4 (H.264) using HandBrake — it's free\n" +
          "• Use Screen Share — play in VLC and share your screen"
        );
      }
    };

    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("durationchange", onDurationChange);
    video.addEventListener("progress", onProgress);
    video.addEventListener("waiting", onWaiting);
    video.addEventListener("canplay", onCanPlay);
    video.addEventListener("ended", onEnded);
    video.addEventListener("error", onError);

    return () => {
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("timeupdate", onTimeUpdate);
      video.removeEventListener("durationchange", onDurationChange);
      video.removeEventListener("progress", onProgress);
      video.removeEventListener("waiting", onWaiting);
      video.removeEventListener("canplay", onCanPlay);
      video.removeEventListener("ended", onEnded);
      video.removeEventListener("error", onError);
    };
  }, [video, isDragging, isYT]);

  const togglePlay = useCallback(() => {
    if (!video) return;
    if (video.paused) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [video]);

  const skip = useCallback(
    (seconds: number) => {
      if (!video || !duration) return;
      video.currentTime = Math.max(0, Math.min(duration, video.currentTime + seconds));
    },
    [video, duration]
  );

  const handleSeek = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!video || !duration) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      video.currentTime = pct * duration;
      setCurrentTime(pct * duration);
    },
    [video, duration]
  );

  const toggleMute = useCallback(() => {
    if (!video) return;
    video.muted = !video.muted;
    setIsMuted(video.muted);
  }, [video]);

  const handleVolume = useCallback(
    (v: number) => {
      if (!video) return;
      video.volume = v;
      setVolume(v);
      setIsMuted(v === 0);
    },
    [video]
  );

  const handleSpeed = useCallback(
    (s: number) => {
      if (!video) return;
      video.playbackRate = s;
      setSpeed(s);
    },
    [video]
  );

  const toggleLoop = useCallback(() => {
    if (!video) return;
    video.loop = !video.loop;
    setIsLooping(video.loop);
  }, [video]);

  const handleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen();
    }
  }, []);

  const handleScreenshot = useCallback(() => {
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = `dipkris_${Math.floor(video.currentTime)}s.png`;
    a.click();
  }, [video]);

  // ── File Upload: just create blob URL and let browser try to play it ──
  const handleFileUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setError(null);
      setIsLoading(false);

      // Create blob URL — the browser will try to play it directly
      // Chrome/Edge can play most MKV files (H.264+AAC inside Matroska container)
      // If it can't play, the error handler above shows a helpful message
      const url = URL.createObjectURL(file);
      dispatch({ type: "SET_VIDEO", src: url, title: file.name });
    },
    [dispatch]
  );

  const handleUrlLoad = useCallback(() => {
    const url = prompt("Enter video URL (YouTube, mp4, m3u8, or webm):");
    if (!url) return;
    dispatch({ type: "SET_VIDEO", src: url, title: url.split("/").pop() || "Video" });
  }, [dispatch]);



  // ── Subtitle Upload ──
  const handleSubtitleUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      let content = event.target?.result as string;
      if (file.name.toLowerCase().endsWith(".srt")) {
        content = srtToVtt(content);
      }
      const blob = new Blob([content], { type: "text/vtt" });
      const url = URL.createObjectURL(blob);
      setSubtitleUrl(url);
      setSubtitlesEnabled(true);
      
      // Force video to use track
      if (videoRef.current) {
        const tracks = videoRef.current.textTracks;
        for (let i = 0; i < tracks.length; i++) {
          tracks[i].mode = "showing";
        }
      }
    };
    reader.readAsText(file);
  }, [videoRef]);

  // Drag & drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDropActive(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDropActive(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDropActive(false);
      const file = e.dataTransfer.files[0];
      if (file && (file.type.startsWith("video/") || file.name.match(/\.(mkv|avi|mov|wmv|flv|mp4|webm|ogg|ts|3gp)$/i))) {
        setError(null);
        setIsLoading(false);
        const url = URL.createObjectURL(file);
        dispatch({ type: "SET_VIDEO", src: url, title: file.name });
      }
    },
    [dispatch]
  );

  // Show/hide controls
  const handleMouseMove = useCallback(() => {
    setShowControls(true);
    clearTimeout(controlsTimerRef.current);
    if (isPlaying) {
      controlsTimerRef.current = setTimeout(() => setShowControls(false), 3000);
    }
  }, [isPlaying]);

  // Format time
  const fmtTime = (s: number) => {
    if (!s || isNaN(s)) return "0:00";
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = String(Math.floor(s % 60)).padStart(2, "0");
    return h ? `${h}:${String(m).padStart(2, "0")}:${sec}` : `${m}:${sec}`;
  };

  // Render YouTube embed
  const renderYouTube = () => {
    if (!state.currentVideo) return null;
    const embedUrl = getYouTubeEmbedUrl(state.currentVideo);
    if (!embedUrl) {
      return (
        <div className="flex-1 flex items-center justify-center text-white/50 text-sm">
          Could not parse YouTube URL. Please check the link.
        </div>
      );
    }
    return (
      <iframe
        src={embedUrl}
        className="absolute inset-0 w-full h-full border-0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        title="YouTube Video"
      />
    );
  };

  // Render Screen Share mode if active
  if (remoteStream || localStream) {
    return (
      <div className="w-full h-full bg-[#000] rounded-xl overflow-hidden relative flex flex-col group">
        <video
          ref={screenVideoRef}
          className="w-full h-full object-contain"
          autoPlay
          playsInline
          muted={!!localStream} // Mute our own stream to avoid feedback loop
        />
        {/* Screen Share Overlay */}
        <div className="absolute top-4 left-4 bg-red-500/80 px-3 py-1.5 rounded-full text-xs font-bold text-white shadow flex items-center gap-2 animate-pulse">
          <MonitorUp className="w-4 h-4" />
          {localStream ? "You are sharing your screen" : "Viewing Screen Share"}
        </div>
        {localStream && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2">
            <button
              onClick={stopShare}
              className="bg-[#ff4444] hover:bg-[#ff2222] text-white px-5 py-2.5 rounded-full font-semibold shadow-xl flex items-center gap-2 transition"
            >
              <MonitorX className="w-5 h-5" />
              Stop Sharing
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`relative flex-1 flex flex-col bg-black rounded-2xl overflow-hidden min-h-0 select-none ${
        dropActive ? "ring-2 ring-[var(--ios-blue)] ring-opacity-80" : ""
      } ${showControls || !state.isPlaying || !state.currentVideo ? "cursor-default" : "cursor-none"}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => {
        handleDragLeave();
        if (isPlaying) setShowControls(false);
      }}
    >
      {/* Live Chat Strip overlay */}
      {state.currentVideo && <LiveChatStrip />}
      {state.currentVideo ? (
        <>
          {/* YouTube: use iframe embed */}
          {isYT ? (
            renderYouTube()
          ) : (
            /* Native video for mp4, mkv, webm, etc. */
            <video
              ref={videoRef}
              className="w-full h-full object-contain cursor-pointer"
              onClick={() => state.clickToPlay && togglePlay()}
              playsInline
              crossOrigin="anonymous"
            >
              {subtitleUrl && subtitlesEnabled && (
                <track
                  kind="subtitles"
                  src={subtitleUrl}
                  srcLang="en"
                  label="English"
                  default
                />
              )}
            </video>
          )}

          {/* Loading spinner — only for non-YouTube */}
          {!isYT && isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-20">
              <Loader2 className="w-10 h-10 text-[var(--ios-blue)] animate-spin" />
            </div>
          )}

          {/* Error message */}
          {!isYT && error && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-20">
              <div className="flex flex-col items-center max-w-sm text-center p-6 glass-panel rounded-3xl border border-white/10">
                <AlertTriangle className="w-10 h-10 text-[#ff4444] mb-3" />
                <h3 className="text-white font-semibold mb-2">Playback Error</h3>
                <p className="text-sm text-white/70 mb-4 whitespace-pre-line">{error}</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => { setError(null); dispatch({ type: "SET_VIDEO", src: null }); }}
                    className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-sm transition"
                  >
                    Clear Video
                  </button>
                  <button
                    onClick={startShare}
                    className="px-4 py-2 bg-[var(--ios-blue)] hover:bg-[var(--ios-blue)]/80 text-white rounded-xl text-sm transition flex items-center gap-1.5"
                  >
                    <MonitorUp className="w-3.5 h-3.5" />
                    Screen Share Instead
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Big play button — only for non-YouTube */}
          {!isYT && !error && showBigPlay && (
            <div
              className="absolute inset-0 flex items-center justify-center z-20 cursor-pointer"
              onClick={togglePlay}
            >
              <div className="w-20 h-20 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center border border-white/20 hover:scale-105 transition-transform">
                <Play className="w-8 h-8 text-white fill-white" />
              </div>
            </div>
          )}

          {/* Sync badge */}
          <div className="absolute top-3 right-3 z-20 flex items-center gap-2 bg-black/40 backdrop-blur-md px-3 py-1 rounded-full text-xs border border-white/10">
            <span className={`w-2 h-2 rounded-full ${state.syncEnabled ? "bg-[#00c853] animate-pulse" : "bg-[#ff4444]"}`} />
            <span className="text-white/80">{state.syncEnabled ? "Synced" : "Sync Off"}</span>
          </div>

          {/* Fullscreen button — always visible for YouTube too */}
          {isYT && (
            <button
              onClick={handleFullscreen}
              className="absolute bottom-3 left-3 z-20 p-2 bg-black/40 backdrop-blur-md text-white/70 hover:text-white rounded-xl border border-white/10 transition"
              title="Fullscreen"
            >
              <Maximize className="w-5 h-5" />
            </button>
          )}

          {/* Controls overlay — only for native video */}
          {!isYT && (
            <div
              className={`absolute bottom-0 left-0 right-0 z-30 transition-opacity duration-300 ${
                showControls ? "opacity-100" : "opacity-0"
              }`}
            >
              <div className="flex items-center gap-2 px-4 py-2 bg-black/80 backdrop-blur-sm">
                <button onClick={() => skip(-10)} className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded transition" title="-10s">
                  <SkipBack className="w-4 h-4" />
                </button>
                <button onClick={togglePlay} className="p-1.5 text-white hover:bg-white/10 rounded transition" title="Play/Pause">
                  {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                </button>
                <button onClick={() => skip(10)} className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded transition" title="+10s">
                  <SkipForward className="w-4 h-4" />
                </button>

                <span className="text-xs text-white/60 ml-1 tabular-nums min-w-[90px]">
                  {fmtTime(currentTime)} / {fmtTime(duration)}
                </span>

                <div className="hidden sm:flex items-center gap-1 ml-2">
                  <button onClick={toggleMute} className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded transition">
                    {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={isMuted ? 0 : volume}
                    onChange={(e) => handleVolume(parseFloat(e.target.value))}
                    className="w-16 h-1 accent-[#b7ff00] cursor-pointer"
                  />
                </div>

                <div className="ml-auto flex items-center gap-1">
                  <select
                    value={speed}
                    onChange={(e) => handleSpeed(parseFloat(e.target.value))}
                    className="bg-transparent text-white/60 text-xs border border-white/20 rounded px-1.5 py-0.5 cursor-pointer hover:border-white/40 transition"
                  >
                    {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 2].map((s) => (
                      <option key={s} value={s} className="bg-[#111]">
                        {s}x
                      </option>
                    ))}
                  </select>

                  <button
                    onClick={toggleLoop}
                    className={`p-1.5 rounded transition ${isLooping ? "text-[#b7ff00]" : "text-white/60 hover:text-white"}`}
                    title="Loop"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>

                  <button onClick={handleScreenshot} className="hidden sm:block p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded transition" title="Screenshot">
                    <Camera className="w-4 h-4" />
                  </button>

                  {/* Subtitles Button */}
                  <label className="p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded transition cursor-pointer" title="Add Subtitle (.srt/.vtt)">
                    <Subtitles className="w-4 h-4" />
                    <input type="file" accept=".srt,.vtt" className="hidden" onChange={handleSubtitleUpload} />
                  </label>
                  
                  {/* CC Toggle */}
                  {subtitleUrl && (
                    <button 
                      onClick={() => setSubtitlesEnabled(!subtitlesEnabled)}
                      className={`p-1.5 rounded transition ${subtitlesEnabled ? "text-[var(--ios-blue)] drop-shadow-[0_0_8px_rgba(10,132,255,0.8)]" : "text-white/60 hover:text-white hover:bg-white/10"}`}
                      title="Toggle Subtitles"
                    >
                      <TextQuote className="w-4 h-4" />
                    </button>
                  )}

                  <button onClick={handleFullscreen} className="p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded transition" title="Fullscreen">
                    <Maximize className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        /* Empty state */
        <div className="flex-1 flex flex-col items-center justify-center gap-6 text-center p-8 bg-transparent">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, type: "spring" }}
            className="w-32 h-32 flex items-center justify-center"
          >
            <SpinningLogo className="text-[100px]" />
          </motion.div>
          <div className="glass-panel p-6 rounded-[2rem] max-w-md w-full">
            <h3 className="text-xl font-bold text-white mb-2">No video loaded yet</h3>
            <p className="text-sm text-white/50 mb-6">
              Upload any video file (MP4, MKV, AVI, WebM) or paste a YouTube URL to get started.
            </p>
            <div className="flex flex-col gap-3">
              <label className="flex items-center justify-center gap-2 bg-gradient-ios text-white px-5 py-3 rounded-xl font-bold text-sm cursor-pointer shadow-lg hover:opacity-90 transition">
                <Upload className="w-4 h-4" />
                Upload File
                <input type="file" accept="video/*,.mkv,.avi,.mov,.wmv,.flv,.ts,.3gp" className="hidden" onChange={handleFileUpload} />
              </label>
              <div className="flex gap-3">
                <button
                  onClick={handleUrlLoad}
                  className="flex-1 flex items-center justify-center gap-2 border border-white/10 bg-white/5 text-white/80 px-5 py-3 rounded-xl font-medium text-sm hover:border-[var(--ios-blue)] hover:text-[var(--ios-blue)] transition backdrop-blur-md"
                >
                  <Link className="w-4 h-4" />
                  Paste URL
                </button>
                <button
                  onClick={startShare}
                  className="flex-1 flex items-center justify-center gap-2 border border-[var(--ios-blue)]/50 text-[var(--ios-blue)] bg-[var(--ios-blue)]/10 px-5 py-3 rounded-xl font-medium text-sm hover:bg-[var(--ios-blue)]/20 transition shadow-[0_0_15px_rgba(10,132,255,0.15)] backdrop-blur-md"
                >
                  <MonitorUp className="w-4 h-4" />
                  Share Screen
                </button>
              </div>
            </div>
            <p className="text-xs text-white/30 mt-4">or drag & drop a video file here</p>
          </div>
        </div>
      )}
    </div>
  );
}
