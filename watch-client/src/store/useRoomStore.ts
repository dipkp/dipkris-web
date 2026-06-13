import { create } from 'zustand';

export interface ChatMessage {
  id: string;
  userId: string;
  text: string;
  timestamp: number;
}

interface RoomState {
  roomId: string | null;
  userId: string | null;
  isHost: boolean;
  users: Array<{ userId: string, socketId: string }>;
  messages: ChatMessage[];
  setRoomId: (id: string) => void;
  setUserId: (id: string) => void;
  setIsHost: (isHost: boolean) => void;
  addUser: (user: { userId: string, socketId: string }) => void;
  removeUser: (socketId: string) => void;
  addMessage: (msg: ChatMessage) => void;
  reset: () => void;
}

export const useRoomStore = create<RoomState>((set) => ({
  roomId: null,
  userId: null,
  isHost: false,
  users: [],
  messages: [],
  setRoomId: (id) => set({ roomId: id }),
  setUserId: (id) => set({ userId: id }),
  setIsHost: (isHost) => set({ isHost }),
  addUser: (user) => set((state) => {
    if (state.users.find(u => u.socketId === user.socketId)) return state;
    return { users: [...state.users, user] };
  }),
  removeUser: (socketId) => set((state) => ({
    users: state.users.filter(u => u.socketId !== socketId)
  })),
  addMessage: (msg) => set((state) => ({
    messages: [...state.messages, msg]
  })),
  reset: () => set({ roomId: null, userId: null, isHost: false, users: [], messages: [] })
}));
