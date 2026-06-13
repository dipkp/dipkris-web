'use client';

import { useEffect, useState } from 'react';
import { Socket } from 'socket.io-client';
import { nanoid } from 'nanoid';

interface DanmakuMessage {
  id: string;
  text: string;
  top: number;
}

export function DanmakuOverlay({ socket, roomId }: { socket: Socket | null, roomId: string }) {
  const [messages, setMessages] = useState<DanmakuMessage[]>([]);

  useEffect(() => {
    if (!socket) return;

    const onMessage = ({ text }: { text: string }) => {
      const id = nanoid();
      const top = Math.floor(Math.random() * 80) + 10; // Position between 10% and 90% height
      
      setMessages(prev => [...prev, { id, text, top }]);

      // Remove from DOM after 6 seconds to prevent memory leaks
      setTimeout(() => {
        setMessages(prev => prev.filter(m => m.id !== id));
      }, 6000);
    };

    socket.on('chat-message', onMessage);

    return () => {
      socket.off('chat-message', onMessage);
    };
  }, [socket]);

  return (
    <div className="absolute inset-0 z-50 pointer-events-none overflow-hidden">
      {messages.map((msg) => (
        <div
          key={msg.id}
          className="absolute whitespace-nowrap text-white font-extrabold text-3xl drop-shadow-[0_2px_2px_rgba(0,0,0,1)] animate-danmaku pointer-events-none"
          style={{ top: `${msg.top}%` }}
        >
          {msg.text}
        </div>
      ))}
    </div>
  );
}
