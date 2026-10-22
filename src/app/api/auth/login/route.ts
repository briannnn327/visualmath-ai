import { NextResponse } from "next/server";
import { createSession } from "@/lib/db/session";
import { findUserByEmail, recordActivity } from "@/lib/db/store";
import { loginSchema } from "@/lib/schemas";
import { badRequest, toPublicUser } from "@/lib/server/api-auth";
import { verifyPassword } from "@/lib/server/password";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("Request body tidak valid");
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message ?? "Data tidak valid");
  }

  const user = await findUserByEmail(parsed.data.email);
  if (!user || !verifyPassword(parsed.data.password, user.password)) {
    return badRequest("Email atau kata sandi salah");
  }

  const { token, session } = await createSession({
    id: user.id,
    role: user.role,
    name: user.name,
    email: user.email,
    userAgent: request.headers.get("user-agent"),
    ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
  });

  await recordActivity({
    userId: user.id,
    actorName: user.name,
    action: "login",
    target: "/login",
    severity: "info",
  });

  const response = NextResponse.json({ user: toPublicUser(user), session }, { status: 200 });
  response.cookies.set("vma_session", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return response;
}
