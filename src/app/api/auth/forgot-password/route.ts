import { NextResponse } from "next/server";
import { createPasswordReset, findUserByEmail, recordActivity } from "@/lib/db/store";
import { type ForgotPasswordInput, forgotPasswordSchema } from "@/lib/schemas";
import { badRequest } from "@/lib/server/api-auth";
import { appBaseUrl, passwordResetEmail, sendEmail } from "@/lib/server/email";
import { generateResetToken, hashResetToken } from "@/lib/server/password";
import { uid } from "@/lib/utils";

/** Masa berlaku token reset (menit). */
const RESET_TTL_MINUTES = 30;

/**
 * Minta tautan reset kata sandi.
 *
 * Tidak ada layanan email pada demo ini, sehingga:
 * - Selalu mengembalikan pesan generik (tidak membocorkan apakah email terdaftar).
 * - Bila `VMA_RESET_SHOW_TOKEN=true` (mis. saat demo/uji), token mentah ikut
 *   dikembalikan di respons agar tautan reset dapat dicoba langsung.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("Request body tidak valid");
  }

  const parsed = forgotPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message ?? "Data tidak valid");
  }
  const input: ForgotPasswordInput = parsed.data;

  const genericMessage =
    "Jika email terdaftar, tautan reset kata sandi telah dibuat. Periksa email Anda.";

  const user = await findUserByEmail(input.email);
  if (!user) {
    // Tetap balas 200 agar tidak mengungkap keberadaan akun.
    return NextResponse.json({ message: genericMessage });
  }

  const token = generateResetToken();
  const expiresAt = new Date(Date.now() + RESET_TTL_MINUTES * 60 * 1000);
  await createPasswordReset({
    id: uid("pr-"),
    userId: user.id,
    tokenHash: hashResetToken(token),
    expiresAt,
  });

  await recordActivity({
    userId: user.id,
    actorName: user.name,
    action: "password.reset.request",
    target: user.email,
    severity: "info",
  });

  const resetUrl = `${appBaseUrl()}/reset-password?token=${token}`;
  const emailResult = await sendEmail({
    to: user.email,
    ...passwordResetEmail(resetUrl, user.name),
  });

  const showToken =
    process.env.VMA_RESET_SHOW_TOKEN === "true" || process.env.NODE_ENV !== "production";

  return NextResponse.json({
    message: genericMessage,
    emailDelivered: emailResult.delivered,
    expiresAt: expiresAt.toISOString(),
    ...(showToken ? { token, resetPath: `/reset-password?token=${token}` } : {}),
  });
}
