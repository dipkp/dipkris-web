import { motion } from "framer-motion";

export default function SpinningLogo({ className = "text-[120px] lg:text-[180px]" }: { className?: string }) {
  return (
    <div className="relative flex items-center justify-center w-full h-full perspective-[1000px]">
      <motion.div
        className={`${className} drop-shadow-[0_0_30px_rgba(10,132,255,0.4)]`}
        style={{ transformStyle: "preserve-3d" }}
      >
        🎬
      </motion.div>
    </div>
  );
}
