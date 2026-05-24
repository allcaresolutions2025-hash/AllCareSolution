import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateOrderNumber(): string {
  const date = new Date();
  const yy = String(date.getFullYear()).slice(-2);
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const rand = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `AM${yy}${mm}${dd}${rand}`;
}

export function buybackDateFrom(deliveredAt: Date, days: number): Date {
  const d = new Date(deliveredAt);
  d.setDate(d.getDate() + days);
  return d;
}
