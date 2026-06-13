export interface RoomUser {
  id: string;
  name: string;
  avatar?: string;
  isHost: boolean;
  isOnline: boolean;
}

export interface ChatMessage {
  id: number;
  roomId: number;
  senderName: string;
  senderAvatar?: string;
  content: string;
  type: "chat" | "system" | "event" | "reaction";
  metadata?: Record<string, any>;
  createdAt: Date;
  isMe?: boolean;
}

export interface QueueItem {
  id: number;
  roomId: number;
  title: string;
  url?: string;
  source: "url" | "file" | "torrent" | "browser";
  addedBy: string;
  position: number;
  isActive: boolean;
}

export interface VideoSource {
  url: string;
  title: string;
  type: "mp4" | "webm" | "m3u8" | "torrent" | "magnet" | "other";
}

export interface RoomState {
  id: number;
  code: string;
  name: string;
  currentVideo: string | null;
  currentVideoTitle: string | null;
  currentTime: number;
  isPlaying: boolean;
}

export interface BrowserDetectedSource {
  url: string;
  type: string;
  label: string;
}

export type SidebarTab = "chat" | "queue" | "settings";
export type ViewMode = "video";
