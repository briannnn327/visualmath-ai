import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db/store", () => ({
  findPasswordResetByHash: vi.fn(async () => null),
  getUserById: vi.fn(async () => null),
  markPasswordResetUsed: vi.fn(async () => undefined),
  updateUserPassword: vi.fn(async () => undefined),
  recordActivity: vi.fn(async () => ({})),
}));

import {
  findPasswordResetByHash,
  getUserById,
  markPasswordResetUsed,
  updateUserPassword,
} from "@/lib/db/store";
import { hashResetToken } from "@/lib/server/password";
import { POST } from "./route";

const TOKEN = "a".repeat(64);
const FUTURE = new Date(Date.now() + 10 * 60 * 1000);

function req(body: unknown): Request {
  return new Request("http://localhost/api/auth/reset-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function payload(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    token: TOKEN,
    password: "katasandibaru8",
    confirmPassword: "katasandibaru8",
    ...overrides,
  };
}

const validRecord = { id: "pr-1", userId: "u-1", expiresAt: FUTURE, usedAt: null };
const user = { id: "u-1", name: "Maria", email: "maria@students.uns.ac.id" };

describe("POST /api/auth/reset-password", () => {
  beforeEach(() => vi.clearAllMocks());

  it("menolak body tidak valid", async () => {
    const res = await POST(req({ token: "pendek" }));
    expect(res.status).toBe(400);
  });

  it("menolak token yang tidak dikenal", async () => {
    vi.mocked(findPasswordResetByHash).mockResolvedValue(null);
    const res = await POST(req(payload()));
    expect(res.status).toBe(400);
    expect(updateUserPassword).not.toHaveBeenCalled();
  });

  it("menolak token yang sudah dipakai", async () => {
    vi.mocked(findPasswordResetByHash).mockResolvedValue({ ...validRecord, usedAt: new Date() });
    const res = await POST(req(payload()));
    expect(res.status).toBe(400);
    expect(updateUserPassword).not.toHaveBeenCalled();
  });

  it("menolak token yang kedaluwarsa", async () => {
    vi.mocked(findPasswordResetByHash).mockResolvedValue({
      ...validRecord,
      expiresAt: new Date(Date.now() - 1000),
    });
    const res = await POST(req(payload()));
    expect(res.status).toBe(400);
  });

  it("mengubah kata sandi (di-hash) dan menandai token terpakai", async () => {
    vi.mocked(findPasswordResetByHash).mockResolvedValue(validRecord);
    vi.mocked(getUserById).mockResolvedValue(user as never);

    const res = await POST(req(payload()));
    const data = (await res.json()) as { message: string };

    expect(res.status).toBe(200);
    expect(data.message).toMatch(/berhasil diperbarui/i);

    // mencari berdasarkan hash token, bukan token mentah
    expect(findPasswordResetByHash).toHaveBeenCalledWith(hashResetToken(TOKEN));
    expect(updateUserPassword).toHaveBeenCalledTimes(1);
    expect(updateUserPassword).toHaveBeenCalledWith(user.id, expect.any(String));
    // hash bcrypt, bukan teks polos
    expect(vi.mocked(updateUserPassword).mock.calls[0][1]).toMatch(/^\$2[aby]\$/);
    expect(markPasswordResetUsed).toHaveBeenCalledWith(validRecord.id);
  });
});
