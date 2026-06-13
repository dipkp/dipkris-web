import { useEffect, useState } from "react";
import { X, CheckCircle, AlertCircle, Info } from "lucide-react";

interface ToastProps {
  message: string;
  type?: "success" | "error" | "info";
  onClose: () => void;
  duration?: number;
}

export default function Toast({ message, type = "info", onClose, duration = 4000 }: ToastProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const show = setTimeout(() => setVisible(true), 50);
    const hide = setTimeout(() => {
      setVisible(false);
      setTimeout(onClose, 300);
    }, duration);
    return () => {
      clearTimeout(show);
      clearTimeout(hide);
    };
  }, [duration, onClose]);

  const iconMap = {
    success: <CheckCircle className="w-4 h-4 text-[#00c853]" />,
    error: <AlertCircle className="w-4 h-4 text-[#ff4444]" />,
    info: <Info className="w-4 h-4 text-[#4285f4]" />,
  };

  const bgMap = {
    success: "bg-[#00c853]/10 border-[#00c853]/30",
    error: "bg-[#ff4444]/10 border-[#ff4444]/30",
    info: "bg-[#4285f4]/10 border-[#4285f4]/30",
  };

  return (
    <div
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-2.5 px-4 py-2.5 rounded-full border backdrop-blur-sm shadow-lg transition-all duration-300 ${bgMap[type]} ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
      }`}
    >
      {iconMap[type]}
      <span className="text-sm text-white font-medium">{message}</span>
      <button onClick={onClose} className="ml-1 text-white/40 hover:text-white transition">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
