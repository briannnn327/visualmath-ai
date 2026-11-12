/* =========================================================
   Seed otomatis saat deploy HANYA bila database masih kosong.
   Tujuan: setelah DATABASE_URL diset di Vercel, akun demo langsung
   tersedia tanpa langkah manual. Idempotent & aman untuk DB berisi data.
   ========================================================= */
import { spawnSync } from "node:child_process";
import { config } from "dotenv";

config({ path: [".env", ".env.local"] });

async function main() {
  if (!process.env.DATABASE_URL) {
    console.log("[deploy] DATABASE_URL belum diset — seed dilewati.");
    return;
  }

  const { prisma } = await import("@/lib/db/prisma");

  try {
    let count: number;
    try {
      count = await prisma.user.count();
    } catch (err) {
      console.error("[deploy] Tabel User belum siap — pastikan migrasi berhasil.", err);
      process.exitCode = 1;
      return;
    }

    if (count > 0) {
      console.log(`[deploy] ${count} pengguna sudah ada — seed dilewati.`);
      return;
    }

    console.log("[deploy] Database kosong — menjalankan seed data demo...");
    const result = spawnSync("npx", ["tsx", "prisma/seed.ts"], {
      stdio: "inherit",
      shell: process.platform === "win32",
    });
    if (result.status !== 0) {
      console.error("[deploy] Seed data demo gagal.");
      process.exitCode = result.status ?? 1;
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("[deploy] Seed otomatis error:", err);
  process.exitCode = 1;
});
