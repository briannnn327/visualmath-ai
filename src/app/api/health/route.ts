import { NextResponse } from "next/server";
import { prisma, resolveDatabaseUrl } from "@/lib/db/prisma";

/**
 * Health check ringan untuk memantau koneksi database.
 * Detail (host DB & pesan error) hanya ditampilkan bila diminta dengan
 * header `x-vma-diag-key` yang cocok, agar tidak bocor ke publik.
 */
export const dynamic = "force-dynamic";

const DIAG_KEY = "vma-diag-2026";

function maskDatabaseUrl(raw: string | undefined) {
  if (!raw) return null;
  try {
    const url = new URL(raw);
    return {
      protocol: url.protocol,
      host: url.host,
      database: url.pathname.replace(/^\//, ""),
      sslmode: url.searchParams.get("sslmode"),
      isLocalhost: /^(localhost|127\.0\.0\.1|::1)$/.test(url.hostname),
    };
  } catch {
    return { invalid: true };
  }
}

export async function GET(request: Request) {
  const detailed =
    request.headers.get("x-vma-diag-key") === DIAG_KEY || process.env.NODE_ENV !== "production";

  let db: "up" | "down" = "down";
  let userTable: "ok" | "error" | "skipped" = "skipped";
  let error: { name?: string; code?: string; message?: string } | null = null;

  try {
    await prisma.$queryRaw`SELECT 1`;
    db = "up";
    try {
      await prisma.user.count();
      userTable = "ok";
    } catch (err) {
      userTable = "error";
      const e = err as { name?: string; code?: string; message?: string };
      error = { name: e.name, code: e.code, message: e.message };
    }
  } catch (err) {
    const e = err as { name?: string; code?: string; message?: string };
    error = { name: e.name, code: e.code, message: e.message };
  }

  const ok = db === "up" && userTable === "ok";
  const databaseUrl = resolveDatabaseUrl();

  const databaseEnvKeys = Object.keys(process.env)
    .filter((key) => /DATABASE|POSTGRES|NEON|PGHOST|PGDATABASE/i.test(key))
    .sort();

  const databaseUrlSource = [
    "DATABASE_URL",
    "POSTGRES_PRISMA_URL",
    "POSTGRES_URL",
    "NEON_DATABASE_URL",
  ].find((key) => Boolean(process.env[key]));

  return NextResponse.json(
    {
      status: ok ? "ok" : "degraded",
      databaseUrlConfigured: Boolean(databaseUrl),
      ...(detailed
        ? {
            databaseUrlSource: databaseUrlSource ?? null,
            database: maskDatabaseUrl(databaseUrl),
            databaseEnvKeys,
            sessionSecretConfigured: Boolean(
              process.env.SESSION_SECRET || process.env.VMA_SESSION_SECRET,
            ),
          }
        : {}),
      db,
      userTable,
      ...(detailed && error ? { error } : {}),
    },
    { status: ok ? 200 : 503 },
  );
}
