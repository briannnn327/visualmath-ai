/* =========================================================
   Sesi autentikasi JWT (jose, HS256) dengan pencabutan (revocable).

   - createSession(): tanda tangani token (jti = id baris Session) + simpan
     baris Session di DB agar dapat dicabut kapan saja.
   - getSession(): verifikasi token, lalu cek baris Session masih aktif
     (belum dicabut & belum kedaluwarsa).
   - destroySession(): cabut baris Session (revoke) sehingga token langsung
     tidak berlaku walau JWT-nya masih valid secara kriptografis.
   ========================================================= */
import { jwtVerify, SignJWT } from "jose";
import { createSessionRecord, getActiveSession, revokeSession } from "@/lib/db/store";
import type { Role, SessionInfo, UserId } from "@/lib/types";
import { uid } from "@/lib/utils";

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
  userAgent?: string | null;
  ip?: string | null;
}): Promise<{ token: string; session: SessionInfo }> {
  const expires = Date.now() + SESSION_TTL_SECONDS * 1000;
  const jti = uid("sess-");

  const session: SessionInfo = {
    userId: input.id,
    role: input.role,
    name: input.name,
    email: input.email,
    expires,
  };

  await createSessionRecord({
    id: jti,
    userId: input.id,
    userAgent: input.userAgent ?? null,
    ip: input.ip ?? null,
    expiresAt: new Date(expires),
  });

  const token = await new SignJWT({
    role: input.role,
    name: input.name,
    email: input.email,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(input.id))
    .setJti(jti)
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
    const jti = payload.jti;
    if (!sub || !jti) return undefined;

    /* Token lama (sebelum fitur revocable) tanpa jti dianggap tidak valid. */
    const active = await getActiveSession(jti);
    if (!active || active.userId !== sub) return undefined;

    return {
      userId: sub as UserId,
      role: payload.role as Role,
      name: String(payload.name ?? ""),
      email: String(payload.email ?? ""),
      expires: active.expiresAt.getTime(),
      sessionId: jti,
    };
  } catch {
    return undefined;
  }
}

/**
 * Verifikasi token sesi secara optimistik (in-memory) untuk Next.js Proxy/Middleware.
 * Memvalidasi tanda tangan kriptografis, masa berlaku (exp), klaim pengguna (sub, role),
 * dan keberadaan identifier sesi (jti) tanpa query database (0ms I/O DB).
 *
 * Validasi pencabutan sesi di database (revocable session) tetap ditegakkan secara
 * penuh di lapisan Server Component dan API Route Handler via getSession().
 */
export async function getSessionOptimistic(
  token: string | undefined,
): Promise<SessionInfo | undefined> {
  if (!token) return undefined;
  try {
    const { payload } = await jwtVerify(token, getSecret(), { algorithms: ["HS256"] });
    const sub = payload.sub;
    const jti = payload.jti;
    if (!sub || !jti) return undefined;

    const expires = typeof payload.exp === "number" ? payload.exp * 1000 : Date.now() + 1;

    return {
      userId: sub as UserId,
      role: payload.role as Role,
      name: String(payload.name ?? ""),
      email: String(payload.email ?? ""),
      expires,
      sessionId: jti,
    };
  } catch {
    return undefined;
  }
}

/** Cabut sesi ini di server sehingga token tidak dapat dipakai lagi. */
export async function destroySession(token?: string): Promise<void> {
  if (!token) return;
  try {
    const { payload } = await jwtVerify(token, getSecret(), { algorithms: ["HS256"] });
    if (payload.jti) await revokeSession(payload.jti);
  } catch {
    /* Token tidak valid/kedaluwarsa — tak ada yang perlu dicabut. */
  }
}
