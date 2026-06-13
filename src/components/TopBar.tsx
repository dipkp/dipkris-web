import { useCallback } from "react";
import { useRoom } from "@/store/RoomContext";
import { useNavigate } from "react-router";
import {
  ArrowLeft,
  Copy,
  Globe,
  Settings,
  Users,
  Radio,
  LogOut,
  Check,
  PanelRight,
} from "lucide-react";
import { useState } from "react";
import SpinningLogo from "@/components/SpinningLogo";

export default function TopBar() {
  const { state, dispatch } = useRoom();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  const handleCopyCode = useCallback(() => {
    if (!state.roomCode) return;
    navigator.clipboard.writeText(state.roomCode).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [state.roomCode]);

  const handleLeave = useCallback(() => {
    dispatch({ type: "LEAVE_ROOM" });
    navigate("/");
  }, [dispatch, navigate]);

  const toggleSidebar = useCallback(() => {
    dispatch({ type: "TOGGLE_SIDEBAR" });
  }, [dispatch]);

  return (
    <div className="h-[52px] glass-panel flex items-center gap-3 px-4 flex-shrink-0 z-50">
      {/* Left: Back + Room info */}
      <button
        onClick={handleLeave}
        className="p-1.5 text-white/40 hover:text-white hover:bg-white/10 rounded transition"
        title="Leave Room"
      >
        <ArrowLeft className="w-4 h-4" />
      </button>

      <div className="flex items-center gap-2">
        <div className="w-5 h-5 flex items-center justify-center">
          <SpinningLogo className="text-[20px]" />
        </div>
        <span className="text-sm font-bold tracking-wider truncate max-w-[150px]">
          {state.roomName || "Dipkris"}
        </span>
        <button
          onClick={handleCopyCode}
          className="flex items-center gap-1 px-2 py-0.5 bg-white/5 border border-white/10 rounded text-[10px] text-white/50 hover:border-[var(--ios-blue)] hover:text-[var(--ios-blue)] transition"
          title="Copy room code"
        >
          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          {state.roomCode}
        </button>
      </div>

      {/* Center: Sync status */}
      <div className="mx-auto flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/10">
        <Radio className={`w-3 h-3 ${state.syncEnabled ? "text-[#34C759]" : "text-[#FF3B30]"}`} />
        <span className="text-[11px] text-white/50">
          {state.syncEnabled ? "Synced" : "Sync Off"}
        </span>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={toggleSidebar}
          className={`p-2 rounded transition ${
            state.isSidebarOpen
              ? "text-[var(--ios-blue)] bg-[var(--ios-blue)]/10"
              : "text-white/60 hover:text-white hover:bg-white/10"
          }`}
          title="Toggle Sidebar"
        >
          <PanelRight className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-1 px-2 py-1">
          <Users className="w-3.5 h-3.5 text-white/30" />
          <span className="text-xs text-white/40">{state.users.length + 1}</span>
        </div>

        <button
          onClick={handleLeave}
          className="p-1.5 text-white/40 hover:text-[#FF3B30] hover:bg-[#FF3B30]/10 rounded transition ml-1"
          title="Leave Room"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
