import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useParams, useLocation } from "react-router";
import { trpc } from "@/providers/trpc";
import { useRoom } from "@/store/RoomContext";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import TopBar from "@/components/TopBar";
import VideoPlayer from "@/components/VideoPlayer";
import ChatPanel from "@/components/ChatPanel";
import QueuePanel from "@/components/QueuePanel";
import SettingsPanel from "@/components/SettingsPanel";
import Toast from "@/components/Toast";
import { MessageSquare, ListMusic, Settings } from "lucide-react";

export default function Room() {
  const { code } = useParams<{ code: string }>();
  const location = useLocation();
  const { state, dispatch } = useRoom();
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  useKeyboardShortcuts();

  const roomQuery = trpc.room.get.useQuery(
    { code: code || "" },
    { enabled: !!code }
  );

  const messagesQuery = trpc.message.list.useQuery(
    { roomId: state.roomId || 0 },
    { enabled: !!state.roomId }
  );

  const queueQuery = trpc.queue.list.useQuery(
    { roomId: state.roomId || 0 },
    { enabled: !!state.roomId }
  );

  useEffect(() => {
    if (!code) return;
    const navState = location.state as {
      myName?: string;
      isHost?: boolean;
      roomName?: string;
    } | null;

    if (roomQuery.data) {
      dispatch({
        type: "INIT_ROOM",
        payload: {
          roomId: roomQuery.data.id,
          roomCode: roomQuery.data.code,
          roomName: navState?.roomName || roomQuery.data.name,
          myName: navState?.myName || "Guest",
          isHost: navState?.isHost || false,
          currentVideo: roomQuery.data.currentVideo || null,
          currentVideoTitle: roomQuery.data.currentVideoTitle || null,
          isPlaying: roomQuery.data.isPlaying || false,
        },
      });
    }
  }, [code, roomQuery.data, location.state, dispatch]);

  useEffect(() => {
    if (messagesQuery.data) {
      const msgs = messagesQuery.data.map((m) => ({
        id: m.id,
        roomId: m.roomId,
        senderName: m.senderName,
        senderAvatar: m.senderAvatar || undefined,
        content: m.content,
        type: m.type,
        metadata: m.metadata as Record<string, any> | undefined,
        createdAt: new Date(m.createdAt),
        isMe: m.senderName === state.myName,
      }));
      dispatch({ type: "SET_MESSAGES", msgs });
    }
  }, [messagesQuery.data, dispatch, state.myName]);

  useEffect(() => {
    if (queueQuery.data) {
      const items = queueQuery.data.map((q) => ({
        id: q.id,
        roomId: q.roomId,
        title: q.title,
        url: q.url || undefined,
        source: q.source,
        addedBy: q.addedBy,
        position: q.position || 0,
        isActive: q.isActive || false,
      }));
      dispatch({ type: "SET_QUEUE", items });
    }
  }, [queueQuery.data, dispatch]);

  useEffect(() => {
    if (state.roomCode) {
      setToast({
        message: state.isHost
          ? `Room ${state.roomCode} created! Share the code.`
          : `Joined room ${state.roomCode}!`,
        type: "success",
      });
    }
  }, [state.roomCode, state.isHost]);

  const tabs = [
    { id: "chat" as const, label: "CHAT", icon: MessageSquare },
    { id: "queue" as const, label: "QUEUE", icon: ListMusic },
    { id: "settings" as const, label: "SETTINGS", icon: Settings },
  ];

  return (
    <div className="w-full h-full flex flex-col overflow-hidden relative z-10 bg-black">
      <TopBar />

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0 relative">
        
        {/* Video Player Area */}
        <div 
          className="w-full md:flex-1 md:w-auto aspect-video md:aspect-auto md:h-full flex flex-col p-0 md:p-3 min-w-0 flex-shrink-0 z-10" 
          data-video-container
        >
          <VideoPlayer />
        </div>

        {/* Sidebar Area - Stacked on bottom for mobile, docked to right for desktop */}
        <div
          className={`flex-1 md:flex-none flex flex-col bg-[#050505] md:bg-[#050505]/95 md:backdrop-blur-md border-t md:border-t-0 md:border-l border-white/10 z-30 overflow-hidden transition-[width] duration-300 ease-out ${
            state.isSidebarOpen ? "md:w-[350px]" : "md:w-0"
          }`}
        >
          {/* Inner wrapper to prevent squishing during animation */}
          <div className="w-full md:w-[350px] flex flex-col h-full">
            <div className="flex border-b border-white/10 flex-shrink-0">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => dispatch({ type: "SET_ACTIVE_TAB", tab: tab.id })}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-3 md:py-2.5 text-[10px] font-bold tracking-wider transition relative ${
                    state.activeTab === tab.id
                      ? "text-[var(--ios-blue)]"
                      : "text-white/40 hover:text-white/70"
                  }`}
                >
                  {state.activeTab === tab.id && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--ios-blue)]" />
                  )}
                  <tab.icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex-1 min-h-0 overflow-hidden bg-transparent">
              {state.activeTab === "chat" && <ChatPanel />}
              {state.activeTab === "queue" && <QueuePanel />}
              {state.activeTab === "settings" && <SettingsPanel />}
            </div>
          </div>
        </div>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
