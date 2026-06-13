import { useCallback } from "react";
import { useRoom } from "@/store/RoomContext";
import { trpc } from "@/providers/trpc";
import { Play, Trash2, Plus, Film, ExternalLink, Magnet } from "lucide-react";

export default function QueuePanel() {
  const { state, dispatch } = useRoom();

  const removeItem = trpc.queue.remove.useMutation({
    onSuccess: (_, vars) => {
      dispatch({ type: "REMOVE_QUEUE_ITEM", id: vars.id });
    },
  });

  const setActive = trpc.queue.setActive.useMutation();

  const handlePlay = useCallback(
    (item: { id: number; url?: string | null; title: string }) => {
      if (!item.url) return;
      dispatch({ type: "SET_VIDEO", src: item.url, title: item.title });
      if (state.roomId) {
        setActive.mutate({ roomId: state.roomId, id: item.id });
      }
    },
    [dispatch, state.roomId, setActive]
  );

  const handleRemove = useCallback(
    (id: number) => {
      removeItem.mutate({ id });
    },
    [removeItem]
  );

  const addItem = trpc.queue.add.useMutation({
    onSuccess: (item) => {
      // Refresh queue logic or local state push
      // TRPC will refresh via polling, but we can do a local dispatch if needed
      // Currently, room Query refetches, but queue has its own query.
      // Easiest is to force a re-fetch of queueQuery.
      const ctx = trpc.useUtils();
      ctx.queue.list.invalidate({ roomId: state.roomId });
    }
  });

  const handleAddUrl = useCallback(() => {
    const url = prompt("Enter video URL (YouTube, Twitch, MP4):");
    if (!url || !state.roomId) return;
    
    // Extract title if possible
    let title = "Custom Video URL";
    if (url.includes("youtube.com") || url.includes("youtu.be")) {
      title = "YouTube Video";
    }

    addItem.mutate({
      roomId: state.roomId,
      title,
      url,
      source: "url",
      addedBy: state.myName || "Guest"
    });
  }, [state.roomId, state.myName, addItem]);

  const handleFileUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !state.roomId) return;
      
      const url = URL.createObjectURL(file);
      addItem.mutate({
        roomId: state.roomId,
        title: file.name,
        url,
        source: "file",
        addedBy: state.myName || "Guest"
      });
      // Optionally also auto-play it if the queue was empty
      if (state.queue.length === 0) {
        dispatch({ type: "SET_VIDEO", src: url, title: file.name });
      }
    },
    [dispatch, state.roomId, state.myName, state.queue.length, addItem]
  );

  return (
    <div className="flex flex-col h-full">
      {/* Queue list */}
      <div className="flex-1 overflow-y-auto scrollbar-thin px-3 py-2 space-y-1.5">
        {state.queue.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center gap-2 py-8">
            <Film className="w-8 h-8 text-white/10" />
            <p className="text-sm text-white/30">No videos in queue</p>
            <p className="text-xs text-white/20">Add videos to create a playlist</p>
          </div>
        ) : (
          state.queue.map((item) => (
            <div
              key={item.id}
              className={`flex items-center gap-2 p-2.5 rounded-xl border transition cursor-pointer group backdrop-blur-md ${
                item.isActive
                  ? "border-[var(--ios-purple)]/40 bg-[var(--ios-purple)]/10 shadow-[0_0_15px_rgba(191,90,242,0.2)]"
                  : "border-white/10 bg-white/5 hover:bg-white/10"
              }`}
              onClick={() => item.url && handlePlay(item)}
            >
              <div className="w-8 h-8 rounded bg-[#1a1a1a] flex items-center justify-center flex-shrink-0">
                {item.source === "torrent" || item.source === "browser" ? (
                  <Magnet className="w-4 h-4 text-[#b7ff00]" />
                ) : (
                  <Film className="w-4 h-4 text-white/40" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm truncate ${item.isActive ? "text-[var(--ios-purple)] font-medium" : "text-white/80"}`}>
                  {item.title}
                </p>
                <p className="text-[10px] text-white/30">
                  {item.source} · {item.addedBy}
                </p>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                {item.url && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePlay(item);
                    }}
                    className="p-1.5 text-white/50 hover:text-[var(--ios-blue)] hover:bg-white/10 rounded transition"
                  >
                    <Play className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemove(item.id);
                  }}
                  className="p-1.5 text-white/50 hover:text-[var(--ios-pink)] hover:bg-white/10 rounded transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add buttons */}
      <div className="px-3 py-2 border-t border-white/10 space-y-1.5 bg-white/5 backdrop-blur-md">
        <label className="flex items-center justify-center gap-2 w-full py-2 bg-gradient-ios text-white rounded-xl font-semibold text-sm cursor-pointer hover:opacity-90 shadow-lg transition">
          <Plus className="w-4 h-4" />
          Add File
          <input type="file" accept="video/*" className="hidden" onChange={handleFileUpload} />
        </label>
        <button
          onClick={handleAddUrl}
          className="w-full flex items-center justify-center gap-1.5 py-2 border border-white/10 text-white/70 rounded-xl text-xs hover:border-[var(--ios-blue)] hover:text-[var(--ios-blue)] hover:bg-white/5 transition"
        >
          <ExternalLink className="w-3 h-3" />
          URL
        </button>
      </div>
    </div>
  );
}
