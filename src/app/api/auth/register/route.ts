import { NextResponse } from "next/server";
import { createSession } from "@/lib/db/session";
import { createUser, findUserByEmail, recordActivity } from "@/lib/db/store";
import { registerSchema } from "@/lib/schemas";
import { badRequest, toPublicUser } from "@/lib/server/api-auth";
import { hashPassword } from "@/lib/server/password";
import type { User } from "@/lib/types";
import { uid } from "@/lib/utils";

export async function POST(request: Request) {
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

  if (await findUserByEmail(parsed.data.email)) {
    return badRequest("Email sudah terdaftar");
  }

  const role = parsed.data.role;
  if (role === "admin") {
    return badRequest("Registrasi admin tidak diizinkan dari halaman ini");
  }

  const user: User = await createUser({
    id: uid("u-"),
    name: parsed.data.name,
    email: parsed.data.email,
    password: hashPassword(parsed.data.password),
    role,
    nim: parsed.data.nim,
    prodi: parsed.data.prodi,
    color: role === "dosen" ? "#006a61" : "#3525cd",
  });

  await recordActivity({
    userId: user.id,
    actorName: user.name,
    action: "register",
    target: user.email,
    severity: "info",
  });

  const { token, session } = await createSession({
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
