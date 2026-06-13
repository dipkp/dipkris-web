import { useRoom } from "@/store/RoomContext";
import { Settings, Radio, MessageCircle, Monitor } from "lucide-react";

interface ToggleProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: () => void;
}

function Toggle({ label, description, checked, onChange }: ToggleProps) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <div className="flex-1 min-w-0 mr-3">
        <p className="text-sm text-white/80">{label}</p>
        {description && <p className="text-[11px] text-white/35 mt-0.5">{description}</p>}
      </div>
      <button
        onClick={onChange}
        className={`relative w-[34px] h-[18px] rounded-full transition-colors flex-shrink-0 shadow-inner ${
          checked ? "bg-[var(--ios-blue)]" : "bg-white/10 border border-white/10"
        }`}
      >
        <div
          className={`absolute top-[3px] w-3 h-3 bg-white rounded-full transition-transform shadow-sm ${
            checked ? "left-[19px]" : "left-[3px]"
          }`}
        />
      </button>
    </div>
  );
}

function Section({ icon: Icon, title, children }: { icon: React.ComponentType<{ className?: string }>; title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 mb-2 pb-1.5 border-b border-white/10">
        <Icon className="w-3.5 h-3.5 text-[var(--ios-purple)]" />
        <span className="text-[10px] font-bold text-white/40 uppercase tracking-[0.15em]">{title}</span>
      </div>
      <div className="px-1">{children}</div>
    </div>
  );
}

export default function SettingsPanel() {
  const { state, dispatch } = useRoom();

  return (
    <div className="flex flex-col h-full overflow-y-auto scrollbar-thin px-4 py-3">
      {/* Room Info */}
      <div className="mb-4 p-3 bg-white/5 backdrop-blur-md rounded-xl border border-white/10 shadow-sm">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Room</span>
          <span className="text-xs text-[var(--ios-blue)] font-mono font-bold">{state.roomCode}</span>
        </div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Name</span>
          <span className="text-xs text-white/70">{state.roomName}</span>
        </div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Role</span>
          <span className="text-xs text-white/70">{state.isHost ? "Host" : "Guest"}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Users</span>
          <span className="text-xs text-white/70">{state.users.length + 1} online</span>
        </div>
      </div>

      <Section icon={Radio} title="Sync">
        <Toggle
          label="Auto-Sync"
          description="Keep playback synchronized with room"
          checked={state.syncEnabled}
          onChange={() => dispatch({ type: "TOGGLE_SYNC" })}
        />
        <Toggle
          label="Broadcast Seeks"
          description="Notify others when you seek"
          checked={state.broadcastSeeks}
          onChange={() => dispatch({ type: "TOGGLE_SETTING", settingKey: "broadcastSeeks" })}
        />
      </Section>

      <Section icon={MessageCircle} title="Chat">
        <Toggle
          label="Message Sound"
          description="Play sound on new messages"
          checked={state.messageSound}
          onChange={() => dispatch({ type: "TOGGLE_SETTING", settingKey: "messageSound" })}
        />
        <Toggle
          label="Floating Reactions"
          description="Show emoji reactions as floating animations"
          checked={state.floatingReactions}
          onChange={() => dispatch({ type: "TOGGLE_SETTING", settingKey: "floatingReactions" })}
        />
      </Section>

      <Section icon={Monitor} title="Player">
        <Toggle
          label="Click to Play/Pause"
          description="Toggle playback by clicking video"
          checked={state.clickToPlay}
          onChange={() => dispatch({ type: "TOGGLE_SETTING", settingKey: "clickToPlay" })}
        />
        <Toggle
          label="Hover Timestamp"
          description="Show time preview on progress bar hover"
          checked={state.hoverTimestamp}
          onChange={() => dispatch({ type: "TOGGLE_SETTING", settingKey: "hoverTimestamp" })}
        />
      </Section>

      <Section icon={Settings} title="Keyboard Shortcuts">
        <div className="text-xs text-white/40 space-y-1.5 py-1">
          <div className="flex justify-between">
            <kbd className="px-1.5 py-0.5 bg-white/10 border border-white/5 rounded text-[10px] font-mono shadow-sm text-white/70">Space</kbd>
            <span>Play/Pause</span>
          </div>
          <div className="flex justify-between">
            <kbd className="px-1.5 py-0.5 bg-white/10 border border-white/5 rounded text-[10px] font-mono shadow-sm text-white/70">F</kbd>
            <span>Fullscreen</span>
          </div>
          <div className="flex justify-between">
            <kbd className="px-1.5 py-0.5 bg-white/10 border border-white/5 rounded text-[10px] font-mono shadow-sm text-white/70">M</kbd>
            <span>Mute</span>
          </div>
          <div className="flex justify-between">
            <kbd className="px-1.5 py-0.5 bg-white/10 border border-white/5 rounded text-[10px] font-mono shadow-sm text-white/70">Left/Right</kbd>
            <span>Seek 10s</span>
          </div>
          <div className="flex justify-between">
            <kbd className="px-1.5 py-0.5 bg-white/10 border border-white/5 rounded text-[10px] font-mono shadow-sm text-white/70">Up/Down</kbd>
            <span>Volume</span>
          </div>
          <div className="flex justify-between">
            <kbd className="px-1.5 py-0.5 bg-white/10 border border-white/5 rounded text-[10px] font-mono shadow-sm text-white/70">L</kbd>
            <span>Loop</span>
          </div>
          <div className="flex justify-between">
            <kbd className="px-1.5 py-0.5 bg-white/10 border border-white/5 rounded text-[10px] font-mono shadow-sm text-white/70">P</kbd>
            <span>Picture-in-Picture</span>
          </div>
          <div className="flex justify-between">
            <kbd className="px-1.5 py-0.5 bg-white/10 border border-white/5 rounded text-[10px] font-mono shadow-sm text-white/70">S</kbd>
            <span>Screenshot</span>
          </div>
        </div>
      </Section>
    </div>
  );
}
