// ============================================
// FILE: app/lib/utils.ts (CREATE THIS)
// ============================================
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}