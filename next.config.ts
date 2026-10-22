import type { NextConfig } from "next";

/**
 * Origin dev yang diizinkan (HMR lintas origin).
 * Alamat IP LAN bersifat per-mesh, jadi diambil dari env `DEV_ORIGIN`
 * alih-alih ditulis permanen di repo.
 */
const devOrigins = ["localhost", "127.0.0.1"];
if (process.env.DEV_ORIGIN) devOrigins.push(process.env.DEV_ORIGIN);

const nextConfig: NextConfig = {
  /* React Compiler aktif (stabil di Next.js 16 + React 19) */
  reactCompiler: {},
  /* Izinkan dev server diakses dari LAN (HMR) tanpa warning cross-origin */
  allowedDevOrigins: devOrigins,
};

export default nextConfig;