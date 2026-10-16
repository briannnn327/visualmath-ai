import { NextResponse } from "next/server";
import {
  findPasswordResetByHash,
  getUserById,
  markPasswordResetUsed,
  recordActivity,
  updateUserPassword,
} from "@/lib/db/store";
import { type ResetPasswordInput, resetPasswordSchema } from "@/lib/schemas";
import { badRequest } from "@/lib/server/api-auth";
import { hashPassword, hashResetToken } from "@/lib/server/password";

/** Selesaikan reset kata sandi memakai token dari tautan email. */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("Request body tidak valid");
  }

  const parsed = resetPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message ?? "Data tidak valid");
  }
  const input: ResetPasswordInput = parsed.data;

  const record = await findPasswordResetByHash(hashResetToken(input.token));
  if (!record || record.usedAt || record.expiresAt.getTime() < Date.now()) {
    return badRequest("Tautan reset tidak valid atau sudah kedaluwarsa");
  }

  const user = await getUserById(record.userId);
  if (!user) return badRequest("Akun tidak ditemukan");

  await updateUserPassword(user.id, hashPassword(input.password));
  await markPasswordResetUsed(record.id);

  await recordActivity({
    userId: user.id,
    actorName: user.name,
    action: "password.reset",
    target: user.email,
    severity: "warning",
  });

  return NextResponse.json({ message: "Kata sandi berhasil diperbarui. Silakan masuk kembali." });
}
