import { useEffect, useRef } from 'react';

export function VideoBox({ stream, isLocal = false }: { stream: MediaStream, isLocal?: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="relative aspect-video bg-gray-800 rounded-xl overflow-hidden border border-gray-700 shadow-md">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal}
        className={`w-full h-full object-cover ${isLocal ? 'scale-x-[-1]' : ''}`}
      />
      {isLocal && (
        <div className="absolute bottom-2 right-2 bg-blue-600 text-xs px-2 py-1 rounded text-white font-bold shadow-lg">
          You
        </div>
      )}
    </div>
  );
}
