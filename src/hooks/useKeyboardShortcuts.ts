import { useEffect } from "react";
import { useRoom } from "@/store/RoomContext";

export function useKeyboardShortcuts() {
  const { state, videoRef } = useRoom();

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handler = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") {
        if (e.key === "Escape") {
          (target as HTMLInputElement).blur();
        }
        return;
      }

      switch (e.code) {
        case "Space":
          e.preventDefault();
          if (video.paused) video.play().catch(() => {});
          else video.pause();
          break;
        case "ArrowRight":
          e.preventDefault();
          video.currentTime = Math.min(video.duration || Infinity, video.currentTime + (e.shiftKey ? 30 : 10));
          break;
        case "ArrowLeft":
          e.preventDefault();
          video.currentTime = Math.max(0, video.currentTime - (e.shiftKey ? 30 : 10));
          break;
        case "ArrowUp":
          e.preventDefault();
          video.volume = Math.min(1, +(video.volume + 0.1).toFixed(2));
          break;
        case "ArrowDown":
          e.preventDefault();
          video.volume = Math.max(0, +(video.volume - 0.1).toFixed(2));
          break;
        case "KeyM":
          video.muted = !video.muted;
          break;
        case "KeyF":
          if (!document.fullscreenElement) {
            video.closest("[data-video-container]")?.requestFullscreen?.().catch(() => {});
          } else {
            document.exitFullscreen();
          }
          break;
        case "KeyL":
          video.loop = !video.loop;
          break;
        case "KeyP":
          if (document.pictureInPictureElement) {
            document.exitPictureInPicture().catch(() => {});
          } else {
            video.requestPictureInPicture().catch(() => {});
          }
          break;
        case "KeyS":
          if (video.videoWidth) {
            const canvas = document.createElement("canvas");
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            canvas.getContext("2d")?.drawImage(video, 0, 0);
            const a = document.createElement("a");
            a.href = canvas.toDataURL("image/png");
            a.download = `dipkris_${Math.floor(video.currentTime)}s.png`;
            a.click();
          }
          break;
      }
    };

    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [videoRef, state.currentVideo]);
}
