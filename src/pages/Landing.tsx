import { useState, useCallback } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import { trpc } from "@/providers/trpc";
import { Film, Users, Zap, MessageSquare, Radio, Shield } from "lucide-react";
import SpinningLogo from "@/components/SpinningLogo";

export default function Landing() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"host" | "join">("host");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const createRoom = trpc.room.create.useMutation({
    onSuccess: (data) => {
      setLoading(false);
      navigate(`/room/${data.room.code}`, {
        state: { myName: name, isHost: true, roomName: data.room.name },
      });
    },
    onError: (err) => {
      setLoading(false);
      setError(err.message);
    },
  });

  const joinRoom = trpc.room.join.useMutation({
    onSuccess: (data) => {
      setLoading(false);
      navigate(`/room/${data.room.code}`, {
        state: { myName: name, isHost: false, roomName: data.room.name },
      });
    },
    onError: (err) => {
      setLoading(false);
      setError(err.message);
    },
  });

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      setError("");

      if (!name.trim()) {
        setError("Please enter your name");
        return;
      }

      setLoading(true);

      if (mode === "host") {
        createRoom.mutate({ name: `${name}'s Room`, hostName: name.trim() });
      } else {
        if (!code.trim()) {
          setError("Please enter a room code");
          setLoading(false);
          return;
        }
        joinRoom.mutate({ code: code.trim().toUpperCase(), guestName: name.trim() });
      }
    },
    [mode, name, code, createRoom, joinRoom]
  );



  return (
    <div className="w-full h-full flex flex-col lg:flex-row relative z-10">
      {/* Left Panel - Visual */}
      <div className="hidden lg:flex w-1/2 flex-col items-center justify-center relative">
        <div className="relative z-10 flex flex-col items-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, type: "spring" }}
            className="w-64 h-64 mb-6"
          >
            <SpinningLogo className="text-[140px] lg:text-[180px]" />
          </motion.div>

        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-[400px] glass-panel p-8 rounded-[2rem]"
        >
          {/* Mobile logo */}
          <div className="lg:hidden flex flex-col items-center text-center mb-8">
            <div className="w-24 h-24">
              <SpinningLogo className="text-[80px]" />
            </div>
          </div>

          {/* Tabs */}
          <div className="flex mb-6 border-b border-white/10">
            <button
              onClick={() => {
                setMode("host");
                setError("");
              }}
              className={`flex-1 pb-3 text-sm font-semibold transition relative ${
                mode === "host"
                  ? "text-white"
                  : "text-white/40 hover:text-white/70"
              }`}
            >
              Host Room
              {mode === "host" && (
                <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--ios-blue)]" />
              )}
            </button>
            <button
              onClick={() => {
                setMode("join");
                setError("");
              }}
              className={`flex-1 pb-3 text-sm font-semibold transition relative ${
                mode === "join"
                  ? "text-white"
                  : "text-white/40 hover:text-white/70"
              }`}
            >
              Join Room
              {mode === "join" && (
                <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--ios-blue)]" />
              )}
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-white/40 uppercase tracking-wider mb-1.5">
                Your Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your display name"
                maxLength={22}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none focus:border-[var(--ios-blue)] transition backdrop-blur-md"
              />
            </div>

            <AnimatePresence mode="wait">
              {mode === "join" && (
                <motion.div
                  key="join-input"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <label className="block text-[10px] font-bold text-white/40 uppercase tracking-wider mb-1.5">
                    Room Code
                  </label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) =>
                      setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))
                    }
                    placeholder="e.g. XK9P2A"
                    maxLength={6}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none focus:border-[var(--ios-blue)] transition font-mono tracking-widest uppercase backdrop-blur-md"
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {error && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-xs text-[#FF3B30] bg-[#FF3B30]/10 px-3 py-2 rounded-xl border border-[#FF3B30]/20"
              >
                {error}
              </motion.p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-ios text-white rounded-xl font-bold text-sm shadow-lg hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : mode === "host" ? (
                "Create Room"
              ) : (
                "Join Room"
              )}
            </button>
          </form>

          <p className="text-center text-[11px] text-white/20 mt-6">
            No account required. Rooms are free and ephemeral.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
