import { NextResponse } from "next/server";
import { registerSchema } from "@/lib/schemas";
import { createSession } from "@/lib/db/session";
import { ensureSeeded, db, findUserByEmail, recordActivity } from "@/lib/db/store";
import { toPublicUser, badRequest } from "@/lib/server/api-auth";
import { uid } from "@/lib/utils";
import type { User, UserId } from "@/lib/types";

export async function POST(request: Request) {
  ensureSeeded();
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("Request body tidak valid");
  }

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message ?? "Data tidak valid");
  }

  if (findUserByEmail(parsed.data.email)) {
    return badRequest("Email sudah terdaftar");
  }

  const role = parsed.data.role;
  if (role === "admin") {
    return badRequest("Registrasi admin tidak diizinkan dari halaman ini");
  }

  const user: User = {
    id: uid("u-") as UserId,
    name: parsed.data.name,
    email: parsed.data.email,
    password: parsed.data.password,
    role,
    nim: parsed.data.nim,
    prodi: parsed.data.prodi,
    color: role === "dosen" ? "#006a61" : "#3525cd",
    createdAt: new Date().toISOString(),
  };
  db.users.push(user);

  recordActivity({
    userId: user.id,
    actorName: user.name,
    action: "register",
    target: user.email,
    severity: "info",
  });

  const { token, session } = createSession({
    id: user.id,
    role: user.role,
    name: user.name,
    email: user.email,
  });

  const response = NextResponse.json({ user: toPublicUser(user), session }, { status: 201 });
  response.cookies.set("vma_session", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return response;
}