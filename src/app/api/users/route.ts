import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import {
  createUser,
  findUserByEmail,
  getKelasById,
  getUserById,
  listKelas,
  listUsers,
  recordActivity,
  updateUser,
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
import { hashPassword } from "@/lib/server/password";
import type { User, UserId } from "@/lib/types";
import { uid } from "@/lib/utils";

async function withMeta(u: User) {
  const kelas = u.kelasId ? await getKelasById(u.kelasId) : undefined;
  return { ...toPublicUser(u), kelasName: kelas?.nama, kelasKode: kelas?.kode };
}

export async function GET(request: NextRequest) {
  const user = await apiUser(request);
  if (!user) return unauthorized();
  if (user.role !== "admin") return forbidden();
  const list = await listUsers();
  const result = await Promise.all(list.map((u) => withMeta(u)));
  return NextResponse.json({ users: result });
}

export async function POST(request: NextRequest) {
  const user = await apiUser(request);
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
  if (await findUserByEmail(input.email)) return badRequest("Email sudah terdaftar");
  if (!input.password) return badRequest("Kata sandi wajib untuk pengguna baru");
  if (input.kelasId && input.role === "mahasiswa") {
    const k = await getKelasById(input.kelasId);
    if (!k) return badRequest("Kelas tidak ditemukan");
  }

  const created = await createUser({
    id: uid("u-"),
    name: input.name,
    email: input.email,
    password: hashPassword(input.password),
    role: input.role,
    nim: input.nim,
    prodi: input.prodi,
    kelasId: input.role === "mahasiswa" ? (input.kelasId ?? undefined) : undefined,
    color: input.role === "dosen" ? "#006a61" : input.role === "admin" ? "#3525cd" : "#00668f",
  });
  if (created.kelasId) {
    await prisma.kelas.update({
      where: { id: created.kelasId },
      data: { mahasiswa: { connect: { id: created.id } } },
    });
  }

  await recordActivity({
    userId: user.id,
    actorName: user.name,
    action: "user.create",
    target: created.email,
    severity: "info",
  });
  return NextResponse.json({ user: await withMeta(created) }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const user = await apiUser(request);
  if (!user) return unauthorized();
  if (user.role !== "admin") return forbidden();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("Request body tidak valid");
  }
  const { id, ...patch } = body as UserAdminInput & { id: string };
  const target = await getUserById(id);
  if (!target) return notFound("Pengguna tidak ditemukan");

  const all = await listUsers();
  if (
    target.role === "admin" &&
    all.filter((u) => u.role === "admin").length <= 1 &&
    patch.role &&
    patch.role !== "admin"
  )
    return badRequest("Minimal harus ada satu admin");

  const updateData: any = {};
  if (patch.name) updateData.name = patch.name;
  if (patch.email && patch.email !== target.email) {
    const existing = await findUserByEmail(patch.email);
    if (existing) return badRequest("Email sudah terdaftar");
    updateData.email = patch.email;
  }
  if (patch.password) updateData.password = hashPassword(patch.password);
  if (patch.nim !== undefined) updateData.nim = patch.nim;
  if (patch.prodi !== undefined) updateData.prodi = patch.prodi;
  if (patch.role) updateData.role = patch.role;

  let newKelasId: string | null | undefined;
  if (patch.kelasId !== undefined && target.role === "mahasiswa") {
    newKelasId = patch.kelasId ?? null;
    updateData.kelasId = newKelasId;
  }

  const updated = await updateUser(target.id, updateData);
  if (newKelasId !== undefined && target.role === "mahasiswa") {
    await prisma.user.update({ where: { id: target.id }, data: { kelasId: newKelasId } });
    const allKelas = await listKelas();
    for (const k of allKelas) {
      const has = k.mahasiswaIds.includes(target.id);
      if (k.id === newKelasId && !has) {
        await prisma.kelas.update({
          where: { id: k.id },
          data: { mahasiswa: { connect: { id: target.id } } },
        });
      }
      if (k.id !== newKelasId && has) {
        await prisma.kelas.update({
          where: { id: k.id },
          data: { mahasiswa: { disconnect: { id: target.id } } },
        });
      }
    }
  }

  await recordActivity({
    userId: user.id,
    actorName: user.name,
    action: "user.update",
    target: updated.email,
    severity: "info",
  });
  return NextResponse.json({ user: await withMeta(updated) });
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
  const target = await getUserById(String(id));
  if (!target) return notFound("Pengguna tidak ditemukan");
  if (target.id === user.id) return badRequest("Tidak dapat menghapus akun sendiri");
  const all = await listUsers();
  if (target.role === "admin" && all.filter((u) => u.role === "admin").length <= 1)
    return badRequest("Tidak dapat menghapus admin terakhir");

  await prisma.user.delete({ where: { id: target.id } });

  await recordActivity({
    userId: user.id,
    actorName: user.name,
    action: "user.delete",
    target: target.email,
    severity: "warning",
  });
  return NextResponse.json({ ok: true });
}
