import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { IconName } from "@/components/ui/icon";

/** Gabungkan class Tailwind dengan deduplikasi konflik (clsx + tailwind-merge). */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** Format angka ke string dengan ribuan separator. */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat("id-ID").format(value);
}

/** Inisial nama untuk avatar. */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Warna avatar deterministik dari string. */
export function avatarColor(seed: string): string {
  const palette = [
    "--color-primary",
    "--color-secondary",
    "--color-tertiary",
    "--color-info",
    "--color-warning",
  ];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  return palette[Math.abs(hash) % palette.length];
}

/** Format tanggal ke format Indonesia. */
export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

/** Format durasi detik → "3 mnt". */
export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds} dtk`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m} mnt ${s} dtk` : `${m} mnt`;
}

/** ID unik sederhana (demo). */
export function uid(prefix = ""): string {
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}${Date.now().toString(36)}${rand}`;
}

/** Peta nama ikon topik (Material Symbols di seed) → set ikon lokal. */
const topicIconMap: Record<string, IconName> = {
  dashboard: "grid",
  route: "route",
  all_inclusive: "infinity",
  gradient: "gradient",
  chart: "monitoring",
  auto_awesome: "sparkle",
  calculate: "calculate",
  orbit: "orbit",
};

export function topicIcon(name: string): IconName {
  return topicIconMap[name] ?? "functions";
}

/** Label kegiatan untuk riwayat. */
export const activityKindLabel: Record<string, string> = {
  formula: "Analisis AI",
  quiz: "Kuis Adaptif",
  lesson: "Materi",
  graph: "Simulasi Grafik",
  auth: "Autentikasi",
  system: "Sistem",
};
