import { useState, useRef, useEffect, useCallback } from "react";
import { useRoom } from "@/store/RoomContext";
import { trpc } from "@/providers/trpc";
import { Send } from "lucide-react";

const QUICK_EMOJIS = ["😂", "🔥", "👀", "😱", "❤️", "👍", "😭", "🎉", "🤯", "🍿", "💀", "👏"];

export default function ChatPanel() {
  const { state, dispatch } = useRoom();
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const sendMessage = trpc.message.send.useMutation({
    onSuccess: (msg) => {
      dispatch({
        type: "ADD_MESSAGE",
        msg: { ...msg, createdAt: new Date(msg.createdAt), isMe: true, senderAvatar: msg.senderAvatar || undefined, metadata: (msg.metadata as Record<string, any>) || undefined },
      });
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [state.messages]);

  const handleSend = useCallback(() => {
    if (!input.trim() || !state.roomId) return;
    sendMessage.mutate({
      roomId: state.roomId,
      senderName: state.myName || "Anonymous",
      content: input.trim(),
      type: "chat",
    });
    setInput("");
  }, [input, state.roomId, state.myName, sendMessage]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  const insertEmoji = (emoji: string) => {
    if (!state.roomId) return;
    sendMessage.mutate({
      roomId: state.roomId,
      senderName: state.myName || "Anonymous",
      content: emoji,
      type: "reaction",
    });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Quick emoji bar */}
      <div className="flex gap-1 px-3 py-2 border-b border-white/10 flex-wrap">
        {QUICK_EMOJIS.map((emoji) => (
          <button
            key={emoji}
            onClick={() => insertEmoji(emoji)}
            className="text-base px-1 py-0.5 rounded hover:bg-white/10 transition"
            title={emoji}
          >
            {emoji}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-thin px-3 py-2 space-y-2">
        {state.messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col gap-0.5 ${
              msg.type === "system"
                ? "items-center"
                : msg.isMe
                ? "items-end"
                : "items-start"
            }`}
          >
            {msg.type !== "system" && (
              <span
                className={`text-[10px] font-bold uppercase tracking-wider ${
                  msg.isMe ? "text-gradient" : msg.type === "event" ? "text-[var(--ios-purple)]" : "text-[var(--ios-blue)]"
                }`}
              >
                {msg.senderName}
              </span>
            )}
            <div
              className={`max-w-[90%] px-3 py-2 rounded-xl text-sm break-words shadow-sm backdrop-blur-md ${
                msg.type === "system"
                  ? "bg-white/5 text-[var(--ios-pink)] text-xs text-center border border-[var(--ios-pink)]/20"
                  : msg.type === "event"
                  ? "bg-white/5 text-[var(--ios-purple)] border-l-2 border-[var(--ios-purple)]"
                  : msg.type === "reaction"
                  ? "text-2xl bg-transparent shadow-none backdrop-blur-none"
                  : msg.isMe
                  ? "bg-gradient-ios text-white border border-white/20"
                  : "bg-white/10 border border-white/10 text-white/90"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="flex items-center gap-2 px-3 py-2 border-t border-white/10 bg-white/5">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none focus:border-[var(--ios-blue)] transition backdrop-blur-md"
        />
        <button
          onClick={handleSend}
          disabled={!input.trim()}
          className="p-2 bg-gradient-ios text-white rounded-xl shadow-lg hover:opacity-90 transition disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
