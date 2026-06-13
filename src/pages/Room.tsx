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
    <div className="w-full h-full flex flex-col overflow-hidden relative z-10">
      <TopBar />

      <div className="flex-1 flex overflow-hidden min-h-0">
        <div className="flex-1 flex flex-col p-3 gap-3 min-w-0" data-video-container>
          <VideoPlayer />
        </div>

        </div>

      <motion.div
        initial={false}
        animate={{ x: state.isSidebarOpen ? 0 : "100%" }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        style={{ willChange: "transform" }}
        className="absolute top-[52px] right-0 h-[calc(100%-52px)] w-[300px] flex flex-col bg-[#050505]/95 backdrop-blur-md border-l border-white/10 z-30 shadow-2xl"
      >
        <div className="flex border-b border-white/10 flex-shrink-0">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => dispatch({ type: "SET_ACTIVE_TAB", tab: tab.id })}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[10px] font-bold tracking-wider transition relative ${
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
      </motion.div>

      {/* Overlay to close sidebar on mobile or desktop if wanted, optional */}
      <AnimatePresence>
        {state.isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => dispatch({ type: "SET_SIDEBAR_OPEN", open: false })}
            className="absolute inset-0 bg-black/20 z-20 md:hidden"
          />
        )}
      </AnimatePresence>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
