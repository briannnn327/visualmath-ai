/* =========================================================
   Sesi autentikasi stateless (demo).
   Token = payload(user+expiry) . HMAC-SHA256(payload).
   Bisa diverifikasi oleh middleware/proxy & route handler
   tanpa berbagi memori antar-runtime.
   ========================================================= */
import { createHmac, timingSafeEqual } from "node:crypto";
import type { Role, SessionInfo, UserId } from "@/lib/types";

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 hari
const SECRET = process.env.VMA_SESSION_SECRET || "visualmath-ai-dev-session-secret";

function encode(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function decode(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8");
}

function sign(payload: string): string {
  return createHmac("sha256", SECRET).update(payload).digest("base64url");
}

export function createSession(input: { id: UserId; role: Role; name: string; email: string }): {
  token: string;
  session: SessionInfo;
} {
  const session: SessionInfo = {
    userId: input.id,
    role: input.role,
    name: input.name,
    email: input.email,
    expires: Date.now() + SESSION_TTL_MS,
  };
  const payload = encode(JSON.stringify(session));
  const token = `${payload}.${sign(payload)}`;
  return { token, session };
}

export function getSession(token: string | undefined): SessionInfo | undefined {
  if (!token) return undefined;
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return undefined;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);

  const expected = sign(payload);
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) return undefined;

  try {
    const data = JSON.parse(decode(payload)) as Record<string, unknown>;
    if (typeof data.expires !== "number" || data.expires < Date.now()) return undefined;
    return {
      userId: data.userId as UserId,
      role: data.role as Role,
      name: String(data.name),
      email: String(data.email),
      expires: data.expires,
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
export function sessionFromHeader(
  cookieHeader: string | null | undefined,
): SessionInfo | undefined {
  if (!cookieHeader) return undefined;
  const match = /(?:^|;\s*)vma_session=([^;]+)/.exec(cookieHeader);
  return getSession(match?.[1]);
}
