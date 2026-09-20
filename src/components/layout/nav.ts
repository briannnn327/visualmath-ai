import type { IconName } from "@/components/ui/icon";
import type { Role } from "@/lib/types";

export interface NavItem {
  href: string;
  label: string;
  icon: IconName;
}

export const mahasiswaNav: NavItem[] = [
  { href: "/dashboard", label: "Beranda", icon: "grid" },
  { href: "/ai-explainer", label: "AI Explainer", icon: "sparkle" },
  { href: "/grafik", label: "Grafik Interaktif", icon: "monitoring" },
  { href: "/latihan", label: "Latihan Adaptif", icon: "target" },
  { href: "/riwayat", label: "Riwayat Belajar", icon: "clock_undo" },
  { href: "/profil", label: "Profil", icon: "user" },
];

export const dosenNav: NavItem[] = [
  { href: "/dosen", label: "Dashboard", icon: "grid" },
  { href: "/dosen/materi", label: "Materi", icon: "book" },
  { href: "/dosen/kelas", label: "Kelas", icon: "users" },
  { href: "/dosen/progres", label: "Progres Mahasiswa", icon: "monitoring" },
];

export const adminNav: NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: "grid" },
  { href: "/admin/pengguna", label: "Pengguna", icon: "users" },
  { href: "/admin/konfigurasi", label: "Konfigurasi AI", icon: "tune" },
  { href: "/admin/monitoring", label: "Monitoring", icon: "monitoring" },
];

export function navFor(role: Role): NavItem[] {
  switch (role) {
    case "dosen":
      return dosenNav;
    case "admin":
      return adminNav;
    default:
      return mahasiswaNav;
  }
}

export function homeFor(role: Role): string {
  return role === "dosen" ? "/dosen" : role === "admin" ? "/admin" : "/dashboard";
}