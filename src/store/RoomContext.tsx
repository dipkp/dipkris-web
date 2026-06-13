import React, { createContext, useContext, useReducer, useRef, useEffect } from "react";
import type { ChatMessage, QueueItem, RoomUser, SidebarTab, ViewMode } from "@/types";

interface RoomState {
  roomId: number | null;
  roomCode: string;
  roomName: string;
  myName: string;
  myId: string;
  isHost: boolean;
  users: RoomUser[];
  messages: ChatMessage[];
  queue: QueueItem[];
  activeTab: SidebarTab;
  viewMode: ViewMode;
  syncEnabled: boolean;
  broadcastSeeks: boolean;
  clickToPlay: boolean;
  hoverTimestamp: boolean;
  messageSound: boolean;
  floatingReactions: boolean;
  currentVideo: string | null;
  currentVideoTitle: string | null;
  isPlaying: boolean;
  isSidebarOpen: boolean;
  [key: string]: any;
}

type Action =
  | { type: "INIT_ROOM"; payload: Partial<RoomState> }
  | { type: "SET_MY_NAME"; name: string }
  | { type: "ADD_USER"; user: RoomUser }
  | { type: "REMOVE_USER"; id: string }
  | { type: "ADD_MESSAGE"; msg: ChatMessage }
  | { type: "SET_MESSAGES"; msgs: ChatMessage[] }
  | { type: "SET_QUEUE"; items: QueueItem[] }
  | { type: "ADD_QUEUE_ITEM"; item: QueueItem }
  | { type: "REMOVE_QUEUE_ITEM"; id: number }
  | { type: "SET_ACTIVE_TAB"; tab: SidebarTab }
  | { type: "SET_VIEW_MODE"; mode: ViewMode }
  | { type: "TOGGLE_SYNC" }
  | { type: "TOGGLE_SETTING"; settingKey: string }
  | { type: "SET_VIDEO"; src: string | null; title?: string }
  | { type: "SET_PLAYING"; playing: boolean }
  | { type: "SET_SIDEBAR_OPEN"; open: boolean }
  | { type: "TOGGLE_SIDEBAR" }
  | { type: "LEAVE_ROOM" };

const initialState: RoomState = {
  roomId: null,
  roomCode: "",
  roomName: "",
  myName: "",
  myId: "",
  isHost: false,
  users: [],
  messages: [],
  queue: [],
  activeTab: "chat",
  viewMode: "video",
  syncEnabled: true,
  broadcastSeeks: true,
  clickToPlay: true,
  hoverTimestamp: true,
  messageSound: true,
  floatingReactions: true,
  currentVideo: null,
  currentVideoTitle: null,
  isPlaying: false,
  isSidebarOpen: false,
};

function roomReducer(state: RoomState, action: Action): RoomState {
  switch (action.type) {
    case "INIT_ROOM":
      return { ...state, ...action.payload };
    case "SET_MY_NAME":
      return { ...state, myName: action.name };
    case "ADD_USER":
      return { ...state, users: [...state.users.filter((u) => u.id !== action.user.id), action.user] };
    case "REMOVE_USER":
      return { ...state, users: state.users.filter((u) => u.id !== action.id) };
    case "ADD_MESSAGE":
      return { ...state, messages: [...state.messages, action.msg] };
    case "SET_MESSAGES":
      return { ...state, messages: action.msgs };
    case "SET_QUEUE":
      return { ...state, queue: action.items };
    case "ADD_QUEUE_ITEM":
      return { ...state, queue: [...state.queue, action.item] };
    case "REMOVE_QUEUE_ITEM":
      return { ...state, queue: state.queue.filter((q) => q.id !== action.id) };
    case "SET_ACTIVE_TAB":
      return { ...state, activeTab: action.tab };
    case "SET_VIEW_MODE":
      return { ...state, viewMode: action.mode };
    case "TOGGLE_SYNC":
      return { ...state, syncEnabled: !state.syncEnabled };
    case "TOGGLE_SETTING":
      return { ...state, [action.settingKey]: !(state as any)[action.settingKey] };
    case "SET_VIDEO":
      return {
        ...state,
        currentVideo: action.src,
        currentVideoTitle: action.title ?? state.currentVideoTitle,
        viewMode: "video",
      };
    case "SET_PLAYING":
      return { ...state, isPlaying: action.playing };
    case "SET_SIDEBAR_OPEN":
      return { ...state, isSidebarOpen: action.open };
    case "TOGGLE_SIDEBAR":
      return { ...state, isSidebarOpen: !state.isSidebarOpen };
    case "LEAVE_ROOM":
      return { ...initialState };
    default:
      return state;
  }
}

interface RoomContextValue {
  state: RoomState;
  dispatch: React.Dispatch<Action>;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  wsRef: React.RefObject<WebSocket | null>;
}

const RoomContext = createContext<RoomContextValue | null>(null);

export function RoomProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(roomReducer, initialState);
  const videoRef = useRef<HTMLVideoElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!state.roomCode) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = import.meta.env.DEV 
      ? "ws://localhost:3002" 
      : `${protocol}//${window.location.host}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({
        type: "join",
        roomId: state.roomCode,
        userId: state.myId || "guest_" + Math.random().toString(36).substring(7)
      }));
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === "chat" || msg.type === "reaction") {
          // Add to local messages if we aren't using TRPC polling
          dispatch({ type: "ADD_MESSAGE", msg: msg.message });
        } else if (msg.type === "peer_joined") {
          dispatch({ type: "ADD_USER", user: { id: msg.peerId, name: msg.peerId, isOnline: true } });
        } else if (msg.type === "peer_left") {
          dispatch({ type: "REMOVE_USER", id: msg.peerId });
        } else if (msg.type === "peer_list") {
          msg.peers.forEach((peerId: string) => {
            dispatch({ type: "ADD_USER", user: { id: peerId, name: peerId, isOnline: true } });
          });
        } else if (msg.type === "sync" && state.syncEnabled) {
          // Handle video sync
          if (videoRef.current) {
            const timeDiff = Math.abs(videoRef.current.currentTime - msg.currentTime);
            if (timeDiff > 2) {
              videoRef.current.currentTime = msg.currentTime;
            }
            if (msg.isPlaying && videoRef.current.paused) {
              videoRef.current.play().catch(() => {});
            } else if (!msg.isPlaying && !videoRef.current.paused) {
              videoRef.current.pause();
            }
          }
        } else if (msg.type === "video_change") {
          dispatch({ type: "SET_VIDEO", src: msg.src, title: msg.title });
        }
      } catch (err) {
        console.error("WS message error", err);
      }
    };

    return () => {
      ws.close();
    };
  }, [state.roomCode, state.syncEnabled]);

  return (
    <RoomContext.Provider value={{ state, dispatch, videoRef, wsRef }}>
      {children}
    </RoomContext.Provider>
  );
}

export function useRoom() {
  const ctx = useContext(RoomContext);
  if (!ctx) throw new Error("useRoom must be used within RoomProvider");
  return ctx;
}
