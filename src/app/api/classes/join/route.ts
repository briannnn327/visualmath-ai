import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { joinKelasByKode, leaveKelas, recordActivity } from "@/lib/db/store";
import { joinClassSchema } from "@/lib/schemas";
import { apiUser, badRequest, notFound, unauthorized } from "@/lib/server/api-auth";

/** Mahasiswa bergabung ke kelas memakai kode. */
export async function POST(request: NextRequest) {
  const user = await apiUser(request);
  if (!user) return unauthorized();
  if (user.role !== "mahasiswa") return badRequest("Hanya mahasiswa yang dapat bergabung ke kelas");

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("Request body tidak valid");
  }
  const parsed = joinClassSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message ?? "Kode kelas tidak valid");
  }

  const kelas = await joinKelasByKode(user.id, parsed.data.kode);
  if (!kelas) return notFound("Kode kelas tidak ditemukan");

  await recordActivity({
    userId: user.id,
    actorName: user.name,
    action: "class.join",
    target: kelas.kode,
    severity: "info",
  });
  return NextResponse.json({ kelas });
}

/** Mahasiswa keluar dari kelasnya saat ini. */
export async function DELETE(request: NextRequest) {
  const user = await apiUser(request);
  if (!user) return unauthorized();
  await leaveKelas(user.id);
  return NextResponse.json({ ok: true });
}
