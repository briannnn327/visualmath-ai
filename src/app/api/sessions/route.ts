import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { listSessionsForUser, revokeSession, revokeSessionsForUser } from "@/lib/db/store";
import { apiSession, apiUser, badRequest, unauthorized } from "@/lib/server/api-auth";

/** Daftar sesi aktif (belum dicabut & belum kedaluwarsa) milik pengguna saat ini. */
export async function GET(request: NextRequest) {
  const user = await apiUser(request);
  if (!user) return unauthorized();
  const current = await apiSession(request);

  const rows = await listSessionsForUser(user.id);
  const sessions = rows
    .filter((s) => !s.revokedAt && s.expiresAt.getTime() > Date.now())
    .map((s) => ({
      id: s.id,
      userAgent: s.userAgent,
      ip: s.ip,
      createdAt: s.createdAt.toISOString(),
      expiresAt: s.expiresAt.toISOString(),
      current: s.id === current?.sessionId,
    }));
  return NextResponse.json({ sessions });
}

/** Cabut sesi: `{ id }` untuk satu sesi, `{ all: true }` untuk semua kecuali sesi ini. */
export async function DELETE(request: NextRequest) {
  const user = await apiUser(request);
  if (!user) return unauthorized();
  const current = await apiSession(request);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("Request body tidak valid");
  }
  const { id, all } = (body ?? {}) as { id?: string; all?: boolean };

  if (all) {
    await revokeSessionsForUser(user.id);
    /* Sesi saat ini ikut dicabut; pengguna diminta masuk kembali. */
    return NextResponse.json({ ok: true, revokedAll: true });
  }

  if (!id) return badRequest("ID sesi wajib diisi");
  if (id === current?.sessionId)
    return badRequest("Tidak dapat mencabut sesi yang sedang aktif dipakai di sini");
  await revokeSession(id);
  return NextResponse.json({ ok: true });
}
