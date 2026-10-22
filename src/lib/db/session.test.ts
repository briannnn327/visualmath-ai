import { SignJWT } from "jose";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db/store", () => ({
  createSessionRecord: vi.fn(async () => undefined),
  getActiveSession: vi.fn(async () => null),
  revokeSession: vi.fn(async () => undefined),
}));

import { getActiveSession, revokeSession } from "@/lib/db/store";
import { destroySession, getSession, getSessionOptimistic } from "./session";

const SECRET = new TextEncoder().encode("visualmath-ai-dev-session-secret-ganti-di-produksi");

async function createTestJwt(
  payload: Record<string, unknown>,
  options: { jti?: string; exp?: string; secret?: Uint8Array } = {},
): Promise<string> {
  const jwt = new SignJWT(payload).setProtectedHeader({ alg: "HS256" });
  if (options.jti) jwt.setJti(options.jti);
  if (options.exp) jwt.setExpirationTime(options.exp);
  else jwt.setExpirationTime("1h");
  return jwt.sign(options.secret ?? SECRET);
}

describe("session — getSessionOptimistic (in-memory, 0ms DB I/O)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("mengembalikan undefined bila token tidak disediakan", async () => {
    expect(await getSessionOptimistic(undefined)).toBeUndefined();
    expect(await getSessionOptimistic("")).toBeUndefined();
    expect(getActiveSession).not.toHaveBeenCalled();
  });

  it("mengembalikan undefined untuk token dengan format atau tanda tangan salah", async () => {
    expect(await getSessionOptimistic("bukan-jwt-valid")).toBeUndefined();
    const wrongSecretToken = await createTestJwt(
      { sub: "u-1", role: "mahasiswa", name: "Maria" },
      {
        jti: "sess-1",
        secret: new TextEncoder().encode("kunci-rahasia-lain-yang-salah-32-karakter"),
      },
    );
    expect(await getSessionOptimistic(wrongSecretToken)).toBeUndefined();
    expect(getActiveSession).not.toHaveBeenCalled();
  });

  it("mengembalikan undefined bila token tidak memiliki klaim jti", async () => {
    const tokenTanpaJti = await createTestJwt({ sub: "u-1", role: "mahasiswa" });
    expect(await getSessionOptimistic(tokenTanpaJti)).toBeUndefined();
    expect(getActiveSession).not.toHaveBeenCalled();
  });

  it("mengembalikan undefined bila token sudah kedaluwarsa", async () => {
    const expiredToken = await createTestJwt(
      { sub: "u-1", role: "mahasiswa" },
      { jti: "sess-1", exp: "-10s" },
    );
    expect(await getSessionOptimistic(expiredToken)).toBeUndefined();
    expect(getActiveSession).not.toHaveBeenCalled();
  });

  it("berhasil memvalidasi token sah secara in-memory tanpa memanggil database", async () => {
    const validToken = await createTestJwt(
      { sub: "u-1", role: "mahasiswa", name: "Maria", email: "maria@uns.ac.id" },
      { jti: "sess-100", exp: "2h" },
    );

    const session = await getSessionOptimistic(validToken);

    expect(session).toBeDefined();
    expect(session?.userId).toBe("u-1");
    expect(session?.role).toBe("mahasiswa");
    expect(session?.name).toBe("Maria");
    expect(session?.email).toBe("maria@uns.ac.id");
    expect(session?.sessionId).toBe("sess-100");
    // Pastikan sama sekali tidak ada I/O ke database
    expect(getActiveSession).not.toHaveBeenCalled();
  });
});

describe("session — getSession (database-backed verification)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("mengembalikan undefined bila sesi di DB tidak ditemukan atau dicabut", async () => {
    const validToken = await createTestJwt(
      { sub: "u-1", role: "mahasiswa" },
      { jti: "sess-revoked", exp: "2h" },
    );
    vi.mocked(getActiveSession).mockResolvedValueOnce(null);

    const session = await getSession(validToken);

    expect(session).toBeUndefined();
    expect(getActiveSession).toHaveBeenCalledWith("sess-revoked");
  });

  it("mengembalikan SessionInfo bila sesi di DB aktif", async () => {
    const validToken = await createTestJwt(
      { sub: "u-1", role: "mahasiswa", name: "Maria", email: "maria@uns.ac.id" },
      { jti: "sess-active", exp: "2h" },
    );
    const expiresAt = new Date(Date.now() + 3600 * 1000);
    vi.mocked(getActiveSession).mockResolvedValueOnce({
      id: "sess-active",
      userId: "u-1",
      userAgent: null,
      ip: null,
      expiresAt,
      revokedAt: null,
      createdAt: new Date(),
    });

    const session = await getSession(validToken);

    expect(session).toBeDefined();
    expect(session?.userId).toBe("u-1");
    expect(session?.sessionId).toBe("sess-active");
    expect(session?.expires).toBe(expiresAt.getTime());
    expect(getActiveSession).toHaveBeenCalledWith("sess-active");
  });
});

describe("session — destroySession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("mencabut sesi di DB bila token memiliki jti valid", async () => {
    const validToken = await createTestJwt(
      { sub: "u-1", role: "mahasiswa" },
      { jti: "sess-to-destroy" },
    );

    await destroySession(validToken);

    expect(revokeSession).toHaveBeenCalledWith("sess-to-destroy");
  });

  it("tidak melempar error bila token tidak valid", async () => {
    await expect(destroySession("token-rusak")).resolves.toBeUndefined();
    expect(revokeSession).not.toHaveBeenCalled();
  });
});
