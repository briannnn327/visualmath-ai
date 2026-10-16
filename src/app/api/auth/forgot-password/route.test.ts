import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db/store", () => ({
  createPasswordReset: vi.fn(async () => undefined),
  findUserByEmail: vi.fn(async () => null),
  recordActivity: vi.fn(async () => ({})),
}));

import { createPasswordReset, findUserByEmail, recordActivity } from "@/lib/db/store";
import { POST } from "./route";

function req(body: unknown): Request {
  return new Request("http://localhost/api/auth/forgot-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const user = { id: "u-1", name: "Maria", email: "maria@students.uns.ac.id" };

describe("POST /api/auth/forgot-password", () => {
  beforeEach(() => vi.clearAllMocks());

  it("menolak body tidak valid", async () => {
    const res = await POST(req({ email: "bukan-email" }));
    expect(res.status).toBe(400);
  });

  it("membalas pesan generik tanpa token bila email tidak terdaftar", async () => {
    vi.mocked(findUserByEmail).mockResolvedValue(null);
    const res = await POST(req({ email: "tidak@ada.com" }));
    const data = (await res.json()) as Record<string, unknown>;

    expect(res.status).toBe(200);
    expect(data.message).toMatch(/jika email terdaftar/i);
    expect(data.token).toBeUndefined();
    expect(createPasswordReset).not.toHaveBeenCalled();
    expect(recordActivity).not.toHaveBeenCalled();
  });

  it("membuat token reset (di-hash) dan mengembalikan tautan di mode non-production", async () => {
    vi.mocked(findUserByEmail).mockResolvedValue(user as never);
    const res = await POST(req({ email: user.email }));
    const data = (await res.json()) as Record<string, unknown>;

    expect(res.status).toBe(200);
    expect(typeof data.token).toBe("string");
    expect(data.resetPath).toMatch(/^\/reset-password\?token=/);
    expect(data.expiresAt).toBeTruthy();

    expect(createPasswordReset).toHaveBeenCalledTimes(1);
    const arg = vi.mocked(createPasswordReset).mock.calls[0][0];
    expect(arg.userId).toBe(user.id);
    // token mentah tidak boleh sama dengan hash yang disimpan
    expect(arg.tokenHash).not.toBe(data.token);
    expect(arg.tokenHash).toHaveLength(64);
    expect(arg.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });
});
