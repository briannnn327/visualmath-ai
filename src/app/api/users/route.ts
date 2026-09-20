import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  db,
  ensureSeeded,
  findUserByEmail,
  getKelasById,
  getUserById,
  recordActivity,
} from "@/lib/db/store";
import { parseBody, type UserAdminInput, userAdminSchema } from "@/lib/schemas";
import {
  apiUser,
  badRequest,
  forbidden,
  notFound,
  toPublicUser,
  unauthorized,
} from "@/lib/server/api-auth";
import type { User, UserId } from "@/lib/types";
import { uid } from "@/lib/utils";

function withMeta(u: User) {
  const kelas = u.kelasId ? getKelasById(u.kelasId) : undefined;
  return { ...toPublicUser(u), kelasName: kelas?.nama, kelasKode: kelas?.kode };
}

export async function GET(request: NextRequest) {
  ensureSeeded();
  const user = apiUser(request);
  if (!user) return unauthorized();
  if (user.role !== "admin") return forbidden();
  const list = [...db.users].sort((a, b) => a.createdAt.localeCompare(b.createdAt)).map(withMeta);
  return NextResponse.json({ users: list });
}

export async function POST(request: NextRequest) {
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
  let input: UserAdminInput;
  try {
    input = parseBody<UserAdminInput>(body, userAdminSchema);
  } catch (err) {
    return badRequest(err instanceof Error ? err.message : "Data tidak valid");
  }
  if (findUserByEmail(input.email)) return badRequest("Email sudah terdaftar");
  if (!input.password) return badRequest("Kata sandi wajib untuk pengguna baru");
  if (input.kelasId && input.role === "mahasiswa" && !getKelasById(input.kelasId))
    return badRequest("Kelas tidak ditemukan");

  const created: User = {
    id: uid("u-") as UserId,
    name: input.name,
    email: input.email,
    password: input.password,
    role: input.role,
    nim: input.nim,
    prodi: input.prodi,
    kelasId: input.role === "mahasiswa" ? (input.kelasId as User["kelasId"]) : undefined,
    color: input.role === "dosen" ? "#006a61" : input.role === "admin" ? "#3525cd" : "#00668f",
    createdAt: new Date().toISOString(),
  };
  db.users.push(created);
  if (created.kelasId) {
    const kelas = db.kelas.find((k) => k.id === created.kelasId);
    if (kelas && !kelas.mahasiswaIds.includes(created.id)) kelas.mahasiswaIds.push(created.id);
  }

  recordActivity({
    userId: user.id,
    actorName: user.name,
    action: "user.create",
    target: created.email,
    severity: "info",
  });
  return NextResponse.json({ user: withMeta(created) }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
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
  const { id, ...patch } = body as UserAdminInput & { id: string };
  const target = getUserById(id);
  if (!target) return notFound("Pengguna tidak ditemukan");

  if (
    target.role === "admin" &&
    db.users.filter((u) => u.role === "admin").length <= 1 &&
    patch.role &&
    patch.role !== "admin"
  )
    return badRequest("Minimal harus ada satu admin");

  if (patch.name) target.name = patch.name;
  if (patch.email && patch.email !== target.email) {
    if (findUserByEmail(patch.email)) return badRequest("Email sudah terdaftar");
    target.email = patch.email;
  }
  if (patch.password) target.password = patch.password;
  if (patch.nim !== undefined) target.nim = patch.nim;
  if (patch.prodi !== undefined) target.prodi = patch.prodi;
  if (patch.role) target.role = patch.role;

  if (patch.kelasId !== undefined && target.role === "mahasiswa") {
    // lepas dari kelas lama
    for (const k of db.kelas) {
      k.mahasiswaIds = k.mahasiswaIds.filter((uid2) => uid2 !== target.id);
    }
    if (patch.kelasId) {
      const kelas = getKelasById(patch.kelasId);
      if (!kelas) return badRequest("Kelas tidak ditemukan");
      target.kelasId = patch.kelasId as User["kelasId"];
      if (!kelas.mahasiswaIds.includes(target.id)) kelas.mahasiswaIds.push(target.id);
    } else {
      target.kelasId = undefined;
    }
  }

  recordActivity({
    userId: user.id,
    actorName: user.name,
    action: "user.update",
    target: target.email,
    severity: "info",
  });
  return NextResponse.json({ user: withMeta(target) });
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
  const target = getUserById(String(id));
  if (!target) return notFound("Pengguna tidak ditemukan");
  if (target.id === user.id) return badRequest("Tidak dapat menghapus akun sendiri");
  if (target.role === "admin" && db.users.filter((u) => u.role === "admin").length <= 1)
    return badRequest("Tidak dapat menghapus admin terakhir");

  for (const k of db.kelas) k.mahasiswaIds = k.mahasiswaIds.filter((uid2) => uid2 !== target.id);
  db.users = db.users.filter((u) => u.id !== target.id);
  db.progress = db.progress.filter((p) => p.userId !== target.id);
  db.history = db.history.filter((h) => h.userId !== target.id);

  recordActivity({
    userId: user.id,
    actorName: user.name,
    action: "user.delete",
    target: target.email,
    severity: "warning",
  });
  return NextResponse.json({ ok: true });
}
