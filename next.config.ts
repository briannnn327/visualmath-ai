import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* React Compiler aktif (stabil di Next.js 16 + React 19) */
  reactCompiler: {},
  /* Izinkan dev server diakses dari LAN (HMR) tanpa warning cross-origin */
  allowedDevOrigins: ["192.168.1.13", "localhost", "127.0.0.1"],
};

export default nextConfig;