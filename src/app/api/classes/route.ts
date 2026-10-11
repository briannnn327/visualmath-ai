import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  createKelas,
  deleteKelas,
  getKelasById,
  getUserById,
  listKelas,
  listProgress,
  recordActivity,
  updateKelas,
} from "@/lib/db/store";
import { type ClassInput, classInputSchema, parseBody } from "@/lib/schemas";
import {
  apiUser,
  badRequest,
  forbidden,
  notFound,
  toPublicUser,
  unauthorized,
} from "@/lib/server/api-auth";
import { getKelasRoster } from "@/lib/server/data";
import type { Kelas } from "@/lib/types";
import { uid } from "@/lib/utils";

async function withStats(k: Kelas) {
  const progress = await listProgress();
  const rows = progress.filter((p) => k.mahasiswaIds.includes(p.userId));
  return {
    ...k,
    studentCount: k.mahasiswaIds.length,
    avgMastery: rows.length
      ? Math.round((rows.reduce((s, p) => s + p.mastery, 0) / rows.length) * 10) / 10
      : 0,
  };
}

export async function GET(request: NextRequest) {
  const user = await apiUser(request);
  if (!user) return unauthorized();
  if (user.role !== "dosen" && user.role !== "admin") return forbidden();

  const detail = request.nextUrl.searchParams.get("detail");
  if (detail) {
    const kelas = await getKelasById(detail);
    if (!kelas) return notFound("Kelas tidak ditemukan");
    if (user.role !== "admin" && kelas.dosenId !== user.id) return forbidden();
    const roster = (await getKelasRoster(kelas)).map((r) => ({
      user: toPublicUser(r.user),
      rows: r.rows,
      avg: r.avg,
      xp: r.xp,
      lastActive: r.lastActive,
    }));
    return NextResponse.json({ classes: [await withStats(kelas)], roster });
  }

  const all = await listKelas();
  const list = all
    .filter((k) => user.role === "admin" || k.dosenId === user.id)
    .map(async (k) => withStats(k));
  const classes = await Promise.all(list);
  classes.sort((a, b) => a.nama.localeCompare(b.nama));
  return NextResponse.json({ classes });
}

export async function POST(request: NextRequest) {
  const user = await apiUser(request);
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
  if (!(await getUserById(input.dosenId))) return badRequest("Dosen tidak ditemukan");

  const all = await listKelas();
  if (all.some((k) => k.kode.toLowerCase() === input.kode.toLowerCase()))
    return badRequest("Kode kelas sudah dipakai");

  const kelas = await createKelas({
    id: uid("k-"),
    kode: input.kode.toUpperCase(),
    nama: input.nama,
    dosenId: input.dosenId,
  });
  await recordActivity({
    userId: user.id,
    actorName: user.name,
    action: "class.create",
    target: kelas.kode,
    severity: "info",
  });
  return NextResponse.json({ class: await withStats(kelas) }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const user = await apiUser(request);
  if (!user) return unauthorized();
  if (user.role !== "dosen" && user.role !== "admin") return forbidden();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("Request body tidak valid");
  }
  const { id, ...patch } = body as ClassInput & { id: string };
  const kelas = await getKelasById(id);
  if (!kelas) return notFound("Kelas tidak ditemukan");
  if (kelas.dosenId !== user.id && user.role !== "admin") return forbidden();

  const update: any = {};
  if (patch.kode) update.kode = patch.kode.toUpperCase();
  if (patch.nama) update.nama = patch.nama;
  if (patch.dosenId) {
    const dosen = await getUserById(patch.dosenId);
    if (dosen) update.dosenId = patch.dosenId;
  }
  const updated = await updateKelas(kelas.id, update);

  await recordActivity({
    userId: user.id,
    actorName: user.name,
    action: "class.update",
    target: updated.kode,
    severity: "info",
  });
  return NextResponse.json({ class: await withStats(updated) });
}

export async function DELETE(request: NextRequest) {
  const user = await apiUser(request);
  if (!user) return unauthorized();
  if (user.role !== "admin") return forbidden();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("Request body tidak valid");
  }
  const { id } = (body ?? {}) as { id?: string };
  const kelas = await getKelasById(String(id));
  if (!kelas) return notFound("Kelas tidak ditemukan");
  await deleteKelas(kelas.id);
  await recordActivity({
    userId: user.id,
    actorName: user.name,
    action: "class.delete",
    target: String(id),
    severity: "info",
  });
  return NextResponse.json({ ok: true });
}
