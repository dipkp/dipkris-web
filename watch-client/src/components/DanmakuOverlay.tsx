"use client";

import { useRoomStore, ChatMessage } from "@/store/useRoomStore";
import { useEffect, useState } from "react";

export default function DanmakuOverlay() {
  const { messages } = useRoomStore();
  const [activeDanmaku, setActiveDanmaku] = useState<(ChatMessage & { top: string })[]>([]);

  useEffect(() => {
    if (messages.length === 0) return;
    // When a new message is added to the store, spawn a Danmaku
    const latestMessage = messages[messages.length - 1];
    
    // Check if it's already active to prevent duplicates in strict mode
    if (activeDanmaku.some(d => d.id === latestMessage.id)) return;

    const newDanmaku = {
      ...latestMessage,
      // Randomly spawn between 5% and 85% from the top
      top: `${Math.floor(Math.random() * 80) + 5}%`
    };

    setActiveDanmaku(prev => [...prev, newDanmaku]);

    // Remove it after the animation completes (7000ms)
    setTimeout(() => {
      setActiveDanmaku(prev => prev.filter(d => d.id !== newDanmaku.id));
    }, 7500); // slightly longer than animation to be safe
  }, [messages]);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-50">
      {activeDanmaku.map(msg => (
        <div
          key={msg.id}
          className="absolute whitespace-nowrap text-white font-bold text-lg md:text-2xl"
          style={{
            top: msg.top,
            right: '-100%',
            animation: 'danmakuScroll 7s linear forwards',
            textShadow: '2px 2px 4px rgba(0,0,0,0.9), -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000'
          }}
        >
          <span className="text-blue-400 mr-2 text-sm md:text-base opacity-80">{msg.userId}</span>
          {msg.text}
        </div>
      ))}
    </div>
  );
}
