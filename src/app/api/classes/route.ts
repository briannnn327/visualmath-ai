import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { classInputSchema, parseBody, type ClassInput } from "@/lib/schemas";
import { db, ensureSeeded, getUserById, recordActivity } from "@/lib/db/store";
import { apiUser, badRequest, forbidden, notFound, toPublicUser, unauthorized } from "@/lib/server/api-auth";
import { getKelasRoster } from "@/lib/server/data";
import { uid } from "@/lib/utils";
import type { Kelas, KelasId, UserId } from "@/lib/types";

function withStats(k: Kelas) {
  const rows = db.progress.filter((p) => k.mahasiswaIds.includes(p.userId));
  return {
    ...k,
    studentCount: k.mahasiswaIds.length,
    avgMastery: rows.length ? Math.round((rows.reduce((s, p) => s + p.mastery, 0) / rows.length) * 10) / 10 : 0,
  };
}

export async function GET(request: NextRequest) {
  ensureSeeded();
  const user = apiUser(request);
  if (!user) return unauthorized();
  if (user.role !== "dosen" && user.role !== "admin") return forbidden();

  const detail = request.nextUrl.searchParams.get("detail");
  if (detail) {
    const kelas = db.kelas.find((k) => k.id === detail);
    if (!kelas) return notFound("Kelas tidak ditemukan");
    if (user.role !== "admin" && kelas.dosenId !== user.id) return forbidden();
    const roster = getKelasRoster(kelas).map((r) => ({
      user: toPublicUser(r.user),
      rows: r.rows,
      avg: r.avg,
      xp: r.xp,
      lastActive: r.lastActive,
    }));
    return NextResponse.json({ classes: [withStats(kelas)], roster });
  }

  const list = db.kelas
    .filter((k) => user.role === "admin" || k.dosenId === user.id)
    .map(withStats)
    .sort((a, b) => a.nama.localeCompare(b.nama));
  return NextResponse.json({ classes: list });
}

export async function POST(request: NextRequest) {
  ensureSeeded();
  const user = apiUser(request);
  if (!user) return unauthorized();
  if (user.role !== "dosen" && user.role !== "admin") return forbidden();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("Request body tidak valid");
  }
  let input: ClassInput;
  try {
    input = parseBody<ClassInput>(body, classInputSchema);
  } catch (err) {
    return badRequest(err instanceof Error ? err.message : "Data tidak valid");
  }
  if (!getUserById(input.dosenId)) return badRequest("Dosen tidak ditemukan");

  if (db.kelas.some((k) => k.kode.toLowerCase() === input.kode.toLowerCase()))
    return badRequest("Kode kelas sudah dipakai");

  const kelas: Kelas = {
    id: uid("k-") as KelasId,
    kode: input.kode.toUpperCase(),
    nama: input.nama,
    dosenId: input.dosenId as UserId,
    mahasiswaIds: [],
    createdAt: new Date().toISOString(),
  };
  db.kelas.push(kelas);
  recordActivity({ userId: user.id, actorName: user.name, action: "class.create", target: kelas.kode, severity: "info" });
  return NextResponse.json({ class: withStats(kelas) }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  ensureSeeded();
  const user = apiUser(request);
  if (!user) return unauthorized();
  if (user.role !== "dosen" && user.role !== "admin") return forbidden();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("Request body tidak valid");
  }
  const { id, ...patch } = body as ClassInput & { id: string };
  const kelas = db.kelas.find((k) => k.id === id);
  if (!kelas) return notFound("Kelas tidak ditemukan");
  if (kelas.dosenId !== user.id && user.role !== "admin") return forbidden();

  if (patch.kode) kelas.kode = patch.kode.toUpperCase();
  if (patch.nama) kelas.nama = patch.nama;
  if (patch.dosenId && getUserById(patch.dosenId)) kelas.dosenId = patch.dosenId as UserId;

  recordActivity({ userId: user.id, actorName: user.name, action: "class.update", target: kelas.kode, severity: "info" });
  return NextResponse.json({ class: withStats(kelas) });
}

export async function DELETE(request: NextRequest) {
  ensureSeeded();
  const user = apiUser(request);
  if (!user) return unauthorized();
  if (user.role !== "admin") return forbidden();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("Request body tidak valid");
  }
  const { id } = (body ?? {}) as { id?: string };
  const idx = db.kelas.findIndex((k) => k.id === id);
  if (idx < 0) return notFound("Kelas tidak ditemukan");
  db.kelas.splice(idx, 1);
  recordActivity({ userId: user.id, actorName: user.name, action: "class.delete", target: String(id), severity: "info" });
  return NextResponse.json({ ok: true });
}