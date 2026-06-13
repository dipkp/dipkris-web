import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function isYouTubeUrl(url: string): boolean {
  return url.includes("youtube.com/watch") || url.includes("youtu.be/") || url.includes("youtube.com/embed/");
}
