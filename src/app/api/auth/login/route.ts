import { NextResponse } from "next/server";
import { loginSchema } from "@/lib/schemas";
import { createSession } from "@/lib/db/session";
import { ensureSeeded, findUserByEmail, recordActivity } from "@/lib/db/store";
import { toPublicUser, badRequest } from "@/lib/server/api-auth";

export async function POST(request: Request) {
  ensureSeeded();
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

  const user = findUserByEmail(parsed.data.email);
  if (!user || user.password !== parsed.data.password) {
    return badRequest("Email atau kata sandi salah");
  }

  const { token, session } = createSession({
    id: user.id,
    role: user.role,
    name: user.name,
    email: user.email,
  });

  recordActivity({
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