/* =========================================================
   Helper autentikasi untuk Route Handler (API mock)
   ========================================================= */
import type { NextRequest } from "next/server";
import { getSession } from "@/lib/db/session";
import { getUserById } from "@/lib/db/store";
import type { PublicUser, SessionInfo, User } from "@/lib/types";

export async function apiSession(request: NextRequest): Promise<SessionInfo | null> {
  const token = request.cookies.get("vma_session")?.value;
  return (await getSession(token)) ?? null;
}

export async function apiUser(request: NextRequest): Promise<User | null> {
  const session = await apiSession(request);
  if (!session) return null;
  return getUserById(session.userId);
}

export function toPublicUser(user: User): PublicUser {
  const { password: _password, ...rest } = user;
  return rest;
}

export function forbidden(): Response {
  return Response.json({ error: "Akses ditolak" }, { status: 403 });
}

export function unauthorized(): Response {
  return Response.json({ error: "Silakan masuk terlebih dahulu" }, { status: 401 });
}

export function badRequest(message: string): Response {
  return Response.json({ error: message }, { status: 400 });
}

export function notFound(message = "Data tidak ditemukan"): Response {
  return Response.json({ error: message }, { status: 404 });
}
