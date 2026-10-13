import { afterEach, describe, expect, it } from "vitest";
import {
  aiRateLimitRule,
  checkAiRateLimit,
  resetAiRateLimits,
  SlidingWindowLimiter,
} from "@/lib/server/rate-limit";

describe("SlidingWindowLimiter — logika murni", () => {
  it("mengizinkan sampai batas lalu memblokir dengan retryAfter", () => {
    const limiter = new SlidingWindowLimiter({ limit: 3, windowMs: 1000 });
    expect(limiter.check("u", 0).allowed).toBe(true);
    expect(limiter.check("u", 1).allowed).toBe(true);
    const third = limiter.check("u", 2);
    expect(limiter.check("u", 3).allowed).toBe(false);
    expect(limiter.check("u", 3).retryAfterMs).toBe(997);
    expect(third.remaining).toBe(0);
  });

  it("jendela bergeser sehingga permintaan lama tidak lagi dihitung", () => {
    const limiter = new SlidingWindowLimiter({ limit: 2, windowMs: 1000 });
    limiter.check("k", 0);
    limiter.check("k", 10);
    expect(limiter.check("k", 20).allowed).toBe(false);
    expect(limiter.check("k", 2000).allowed).toBe(true); // entri lama sudah kedaluwarsa
  });

  it("menghitung setiap key secara terpisah", () => {
    const limiter = new SlidingWindowLimiter({ limit: 1, windowMs: 1000 });
    expect(limiter.check("a").allowed).toBe(true);
    expect(limiter.check("a").allowed).toBe(false);
    expect(limiter.check("b").allowed).toBe(true);
  });

  it("reset membersihkan riwayat", () => {
    const limiter = new SlidingWindowLimiter({ limit: 1, windowMs: 1000 });
    expect(limiter.check("a").allowed).toBe(true);
    expect(limiter.check("a").allowed).toBe(false);
    limiter.reset("a");
    expect(limiter.check("a").allowed).toBe(true);
  });
});

describe("bucket rate limit AI", () => {
  afterEach(() => resetAiRateLimits());

  it("membatasi per pengguna dan bisa direset", () => {
    const { limit } = aiRateLimitRule("scan");
    let last = checkAiRateLimit("scan", "u1");
    for (let i = 1; i < limit; i++) last = checkAiRateLimit("scan", "u1");
    expect(last.allowed).toBe(true);
    expect(last.remaining).toBe(0);

    expect(checkAiRateLimit("scan", "u1").allowed).toBe(false);
    expect(checkAiRateLimit("scan", "u2").allowed).toBe(true);

    resetAiRateLimits("scan");
    expect(checkAiRateLimit("scan", "u1").allowed).toBe(true);
  });
});
