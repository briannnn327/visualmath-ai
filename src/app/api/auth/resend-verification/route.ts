import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createEmailVerificationToken, findUserByEmail, recordActivity } from "@/lib/db/store";
import { apiUser, badRequest, unauthorized } from "@/lib/server/api-auth";
import { appBaseUrl, emailVerificationEmail, sendEmail } from "@/lib/server/email";
import { generateResetToken, hashResetToken } from "@/lib/server/password";
import { uid } from "@/lib/utils";

const TTL_MS = 24 * 60 * 60 * 1000;

export async function POST(request: NextRequest) {
  const user = await apiUser(request);
  if (!user) return unauthorized();

  const fullUser = await findUserByEmail(user.email);
  if (!fullUser) return badRequest("Pengguna tidak ditemukan.");

  if (fullUser.emailVerifiedAt) {
    return NextResponse.json({ message: "Email sudah terverifikasi." });
  }

  const token = generateResetToken();
  const expiresAt = new Date(Date.now() + TTL_MS);
  await createEmailVerificationToken({
    id: uid("ev-"),
    userId: fullUser.id,
    tokenHash: hashResetToken(token),
    expiresAt,
  });

  await recordActivity({
    userId: fullUser.id,
    actorName: fullUser.name,
    action: "email.verification.resend",
    target: fullUser.email,
    severity: "info",
  });

  const verifyUrl = `${appBaseUrl()}/verifikasi-email?token=${token}`;
  await sendEmail({
    to: fullUser.email,
    ...emailVerificationEmail(verifyUrl, fullUser.name),
  });

  return NextResponse.json({ message: "Tautan verifikasi baru telah dikirim." });
}
