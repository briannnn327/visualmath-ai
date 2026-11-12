import { spawnSync } from "node:child_process";
import { config } from "dotenv";

config({ path: [".env", ".env.local"] });

if (!process.env.DATABASE_URL) {
  console.log("[deploy] DATABASE_URL belum diset — migrasi database dilewati.");
  process.exit(0);
}

console.log("[deploy] Menjalankan prisma migrate deploy...");
const result = spawnSync("npx", ["prisma", "migrate", "deploy", "--config", "prisma7.config.ts"], {
  stdio: "inherit",
  shell: process.platform === "win32",
});

if (result.status !== 0) {
  console.error("[deploy] Migrasi database gagal.");
  process.exit(result.status ?? 1);
}
