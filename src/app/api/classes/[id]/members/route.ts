import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  addKelasMember,
  getKelasById,
  listUsers,
  recordActivity,
  removeKelasMember,
} from "@/lib/db/store";
import {
  apiUser,
  badRequest,
  forbidden,
  notFound,
  toPublicUser,
  unauthorized,
} from "@/lib/server/api-auth";
import type { Kelas, User } from "@/lib/types";

const addMemberSchema = z.object({
  query: z.string().trim().min(3, "Masukkan email atau NIM mahasiswa").max(120),
});

const removeMemberSchema = z.object({
  userId: z.string().min(1, "Anggota tidak valid"),
});

function canManage(user: User, kelas: Kelas): boolean {
  return user.role === "admin" || (user.role === "dosen" && kelas.dosenId === user.id);
}

/** Daftar anggota kelas (dosen pemilik & admin). */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await apiUser(request);
  if (!user) return unauthorized();
  if (user.role !== "dosen" && user.role !== "admin") return forbidden();

  const { id } = await params;
  const kelas = await getKelasById(id);
  if (!kelas) return notFound("Kelas tidak ditemukan");
  if (!canManage(user, kelas)) return forbidden();

  const ids = new Set(kelas.mahasiswaIds);
  const members = (await listUsers())
    .filter((u) => ids.has(u.id))
    .map(toPublicUser)
    .sort((a, b) => a.name.localeCompare(b.name));

  return NextResponse.json({ members });
}

/** Tambahkan mahasiswa ke kelas lewat email atau NIM. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await apiUser(request);
  if (!user) return unauthorized();
  if (user.role !== "dosen" && user.role !== "admin") return forbidden();

  const { id } = await params;
  const kelas = await getKelasById(id);
  if (!kelas) return notFound("Kelas tidak ditemukan");
  if (!canManage(user, kelas)) return forbidden();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("Request body tidak valid");
  }
  const parsed = addMemberSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message ?? "Data tidak valid");
  }

  const query = parsed.data.query.trim().toLowerCase();
  const target = (await listUsers()).find(
    (u) =>
      u.role === "mahasiswa" &&
      (u.email.toLowerCase() === query || u.nim?.trim().toLowerCase() === query),
  );
  if (!target) return notFound("Mahasiswa dengan email/NIM tersebut tidak ditemukan");
  if (target.kelasId === kelas.id) return badRequest("Mahasiswa sudah menjadi anggota kelas ini");
  if (target.kelasId) {
    const lain = await getKelasById(target.kelasId);
    return badRequest(`Mahasiswa sudah tergabung di kelas ${lain?.nama ?? "lain"}`);
  }

  await addKelasMember(kelas.id, target.id);
  await recordActivity({
    userId: user.id,
    actorName: user.name,
    action: "class.member.add",
    target: `${kelas.kode} · ${target.name}`,
    severity: "info",
  });

  return NextResponse.json({ member: toPublicUser(target) }, { status: 201 });
}

/** Keluarkan mahasiswa dari kelas (akun tetap ada). */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await apiUser(request);
  if (!user) return unauthorized();
  if (user.role !== "dosen" && user.role !== "admin") return forbidden();

  const { id } = await params;
  const kelas = await getKelasById(id);
  if (!kelas) return notFound("Kelas tidak ditemukan");
  if (!canManage(user, kelas)) return forbidden();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("Request body tidak valid");
  }
  const parsed = removeMemberSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message ?? "Data tidak valid");
  }
  if (!new Set<string>(kelas.mahasiswaIds).has(parsed.data.userId)) {
    return notFound("Mahasiswa bukan anggota kelas ini");
  }

  const target = (await listUsers()).find((u) => u.id === parsed.data.userId);
  await removeKelasMember(kelas.id, parsed.data.userId);
  await recordActivity({
    userId: user.id,
    actorName: user.name,
    action: "class.member.remove",
    target: `${kelas.kode} · ${target?.name ?? parsed.data.userId}`,
    severity: "warning",
  });

  return NextResponse.json({ ok: true });
}
