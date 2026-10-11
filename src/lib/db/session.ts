/* =========================================================
   Sesi autentikasi stateless berbasis JWT (jose, HS256).
   - createSession(): menandatangani token + info sesi
   - getSession(): verifikasi token (async, dipakai proxy & route)
   - destroySession(): stateless — cukup hapus cookie di klien
   ========================================================= */
import { jwtVerify, SignJWT } from "jose";
import type { Role, SessionInfo, UserId } from "@/lib/types";

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 hari

function getSecret(): Uint8Array {
  const secret =
    process.env.SESSION_SECRET ||
    process.env.VMA_SESSION_SECRET ||
    "visualmath-ai-dev-session-secret-ganti-di-produksi";
  return new TextEncoder().encode(secret);
}

export async function createSession(input: {
  id: UserId;
  role: Role;
  name: string;
  email: string;
}): Promise<{ token: string; session: SessionInfo }> {
  const session: SessionInfo = {
    userId: input.id,
    role: input.role,
    name: input.name,
    email: input.email,
    expires: Date.now() + SESSION_TTL_SECONDS * 1000,
  };

  const token = await new SignJWT({
    role: input.role,
    name: input.name,
    email: input.email,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(input.id))
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(getSecret());

  return { token, session };
}

export async function getSession(token: string | undefined): Promise<SessionInfo | undefined> {
  if (!token) return undefined;
  try {
    const { payload } = await jwtVerify(token, getSecret(), { algorithms: ["HS256"] });
    const sub = payload.sub;
    if (!sub) return undefined;
    const expires = typeof payload.exp === "number" ? payload.exp * 1000 : Date.now() + 1;
    return {
      userId: sub as UserId,
      role: payload.role as Role,
      name: String(payload.name ?? ""),
      email: String(payload.email ?? ""),
      expires,
    };
  } catch {
    return undefined;
  }
}

/* Stateless: logout hanya menghapus cookie di sisi klien. */
export function destroySession(_token?: string): void {
  return;
}

/** Untuk halaman RSC: baca sesi dari cookie header. */
export async function sessionFromHeader(
  cookieHeader: string | null | undefined,
): Promise<SessionInfo | undefined> {
  if (!cookieHeader) return undefined;
  const match = /(?:^|;\s*)vma_session=([^;]+)/.exec(cookieHeader);
  return getSession(match?.[1]);
}
