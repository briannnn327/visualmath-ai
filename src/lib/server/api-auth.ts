/* =========================================================
   Helper autentikasi untuk Route Handler (API mock)
   ========================================================= */
import type { NextRequest } from "next/server";
import { getSession } from "@/lib/db/session";
import { ensureSeeded, getUserById } from "@/lib/db/store";
import type { PublicUser, SessionInfo, User } from "@/lib/types";

export function apiSession(request: NextRequest): SessionInfo | null {
  const token = request.cookies.get("vma_session")?.value;
  return getSession(token) ?? null;
}

export function apiUser(request: NextRequest): User | null {
  ensureSeeded();
  const session = apiSession(request);
  if (!session) return null;
  return getUserById(session.userId) ?? null;
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
