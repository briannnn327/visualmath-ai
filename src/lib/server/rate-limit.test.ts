import { afterEach, describe, expect, it, vi } from "vitest";
import {
  aiRateLimitRule,
  checkAiRateLimit,
  createMemoryStore,
  createPostgresStore,
  type RateLimitDb,
  type RateLimitRule,
  resetAiRateLimits,
  SlidingWindowLimiter,
  setRateLimitStore,
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

/* ---------- Store Postgres (dengan DB palsu in-memory) ---------- */

interface FakeRow {
  id: string;
  bucket: string;
  key: string;
  createdAt: Date;
}

type FakeDb = RateLimitDb & { rows: FakeRow[] };

/** DB palsu yang meniru tiga bentuk query yang dipakai createPostgresStore. */
function createFakeDb(): FakeDb {
  const rows: FakeRow[] = [];
  return {
    rows,
    async $executeRawUnsafe(query: string, ...values: unknown[]): Promise<number> {
      if (query.startsWith("DELETE")) {
        const [bucket, key, cutoff] = values as [string, string, Date];
        for (let i = rows.length - 1; i >= 0; i--) {
          const r = rows[i];
          if (r.bucket === bucket && r.key === key && r.createdAt.getTime() <= cutoff.getTime()) {
            rows.splice(i, 1);
          }
        }
      } else if (query.startsWith("INSERT")) {
        const [id, bucket, key, createdAt] = values as [string, string, string, Date];
        rows.push({ id, bucket, key, createdAt });
      }
      return 0;
    },
    async $queryRawUnsafe<T = unknown>(_query: string, ...values: unknown[]): Promise<T> {
      const [bucket, key] = values as [string, string];
      const matched = rows.filter((r) => r.bucket === bucket && r.key === key);
      const oldest = matched.length
        ? matched.reduce((a, b) => (a.createdAt < b.createdAt ? a : b)).createdAt
        : null;
      return [{ count: matched.length, oldest }] as T;
    },
  };
}

describe("createPostgresStore — sliding window log", () => {
  const rule: RateLimitRule = { limit: 2, windowMs: 1000 };

  it("menghitung hit, memblokir di batas, dan menyimpan satu baris per hit", async () => {
    const db = createFakeDb();
    const store = createPostgresStore(db);

    const first = await store.hit("scan", "u1", rule, 1000);
    expect(first.allowed).toBe(true);
    expect(first.remaining).toBe(1);

    const second = await store.hit("scan", "u1", rule, 1001);
    expect(second.allowed).toBe(true);
    expect(second.remaining).toBe(0);
    expect(db.rows).toHaveLength(2);

    const blocked = await store.hit("scan", "u1", rule, 1002);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.retryAfterMs).toBe(998); // oldest(1000) + 1000 - 1002
    expect(db.rows).toHaveLength(2); // tidak menambah baris saat diblokir
  });

  it("menghapus hit kedaluwarsa sehingga jendela bergeser", async () => {
    const db = createFakeDb();
    const store = createPostgresStore(db);

    await store.hit("scan", "u1", rule, 1000);
    await store.hit("scan", "u1", rule, 1001);
    expect((await store.hit("scan", "u1", rule, 1002)).allowed).toBe(false);

    // 2001 berada di luar jendela → baris lama dibersihkan
    const fresh = await store.hit("scan", "u1", rule, 2001);
    expect(fresh.allowed).toBe(true);
    expect(db.rows).toHaveLength(1);
  });

  it("memisahkan kuota antar key", async () => {
    const db = createFakeDb();
    const store = createPostgresStore(db);
    await store.hit("scan", "u1", rule, 1000);
    await store.hit("scan", "u1", rule, 1001);
    expect((await store.hit("scan", "u1", rule, 1002)).allowed).toBe(false);
    expect((await store.hit("scan", "u2", rule, 1002)).allowed).toBe(true);
  });
});

/* ---------- checkAiRateLimit & fallback ---------- */

describe("checkAiRateLimit", () => {
  afterEach(() => {
    setRateLimitStore(null);
    resetAiRateLimits();
    vi.restoreAllMocks();
  });

  it("membatasi per pengguna lewat store aktif dan mengizinkan pengguna lain", async () => {
    setRateLimitStore(createMemoryStore());
    const { limit } = aiRateLimitRule("scan");

    let last = await checkAiRateLimit("scan", "u1", 1000);
    for (let i = 1; i < limit; i++) {
      last = await checkAiRateLimit("scan", "u1", 1000);
    }
    expect(last.allowed).toBe(true);
    expect(last.remaining).toBe(0);

    expect((await checkAiRateLimit("scan", "u1", 1000)).allowed).toBe(false);
    expect((await checkAiRateLimit("scan", "u2", 1000)).allowed).toBe(true);
  });

  it("fallback ke in-memory bila store melempar error", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    setRateLimitStore({
      async hit() {
        throw new Error("db down");
      },
    });

    const res = await checkAiRateLimit("scan", "u1", 1000);
    expect(res.allowed).toBe(true);
    expect(warn).toHaveBeenCalled();
  });
});
