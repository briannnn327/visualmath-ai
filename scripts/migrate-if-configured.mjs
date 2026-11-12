import { spawnSync } from "node:child_process";
import { config } from "dotenv";

config({ path: [".env", ".env.local"] });

const databaseUrl =
  process.env.DATABASE_URL ??
  process.env.POSTGRES_URL_NON_POOLING ??
  process.env.POSTGRES_PRISMA_URL ??
  process.env.POSTGRES_URL ??
  process.env.NEON_DATABASE_URL;

if (!databaseUrl) {
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
