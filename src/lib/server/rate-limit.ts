/* =========================================================
   Rate limiter sliding-window untuk endpoint AI.

   Store default: PostgreSQL (tabel "RateLimitHit") sehingga kuota
   dihitung bersama lintas-instance (cocok untuk Vercel/serverless).
   Bila DB sedang bermasalah, otomatis jatuh ke store in-memory
   (per-proses) agar endpoint AI tidak ikut gagal total.
   ========================================================= */

import { randomString } from "@/lib/utils";

export interface RateLimitRule {
  /** Jumlah maksimum permintaan dalam satu jendela. */
  limit: number;
  /** Panjang jendela dalam milidetik. */
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  /** Sisa waktu (ms) sampai permintaan boleh dicoba lagi (0 bila diizinkan). */
  retryAfterMs: number;
}

/** Limiter murni & deterministik (waktu dapat disuntik lewat `now`) — mudah diuji. */
export class SlidingWindowLimiter {
  private readonly hits = new Map<string, number[]>();

  constructor(private readonly rule: RateLimitRule) {}

  check(key: string, now = Date.now()): RateLimitResult {
    const { limit, windowMs } = this.rule;
    const cutoff = now - windowMs;
    const recent = (this.hits.get(key) ?? []).filter((t) => t > cutoff);

    if (recent.length >= limit) {
      this.hits.set(key, recent);
      return {
        allowed: false,
        remaining: 0,
        retryAfterMs: Math.max(0, (recent[0] ?? now) + windowMs - now),
      };
    }

    recent.push(now);
    this.hits.set(key, recent);
    this.prune(now);
    return { allowed: true, remaining: limit - recent.length, retryAfterMs: 0 };
  }

  reset(key?: string): void {
    if (key === undefined) this.hits.clear();
    else this.hits.delete(key);
  }

  /** Buang entri yang sudah kedaluwarsa ketika map membesar, agar tidak bocor memori. */
  private prune(now: number): void {
    if (this.hits.size < 5000) return;
    const cutoff = now - this.rule.windowMs;
    for (const [key, values] of this.hits) {
      const fresh = values.filter((t) => t > cutoff);
      if (fresh.length === 0) this.hits.delete(key);
      else this.hits.set(key, fresh);
    }
  }
}

/* ---------- Store yang dapat ditukar (DB / in-memory) ---------- */

export interface RateLimitStore {
  hit(bucket: AiBucket, key: string, rule: RateLimitRule, now: number): Promise<RateLimitResult>;
}

/** Klien minimal Prisma yang dibutuhkan (memudahkan pengujian tanpa DB). */
export interface RateLimitDb {
  $executeRawUnsafe(query: string, ...values: unknown[]): Promise<number>;
  $queryRawUnsafe<T = unknown>(query: string, ...values: unknown[]): Promise<T>;
}

/** Store in-memory (per-proses) — dipakai sebagai fallback. */
export function createMemoryStore(): RateLimitStore {
  const limiters = new Map<AiBucket, SlidingWindowLimiter>();
  return {
    async hit(bucket, key, rule, now) {
      let limiter = limiters.get(bucket);
      if (!limiter) {
        limiter = new SlidingWindowLimiter(rule);
        limiters.set(bucket, limiter);
      }
      return limiter.check(key, now);
    },
  };
}

/**
 * Store berbasis PostgreSQL. Menyimpan tiap hit sebagai baris, lalu menghitung
 * jumlah hit dalam jendela berjalan (sliding window log).
 */
export function createPostgresStore(db: RateLimitDb): RateLimitStore {
  return {
    async hit(bucket, key, rule, now) {
      const cutoff = new Date(now - rule.windowMs);

      await db.$executeRawUnsafe(
        'DELETE FROM "RateLimitHit" WHERE bucket = $1 AND "key" = $2 AND "createdAt" <= $3',
        bucket,
        key,
        cutoff,
      );

      const rows = await db.$queryRawUnsafe<Array<{ count: number | bigint; oldest: unknown }>>(
        'SELECT COUNT(*)::int AS count, MIN("createdAt") AS oldest FROM "RateLimitHit" WHERE bucket = $1 AND "key" = $2',
        bucket,
        key,
      );

      const row = rows[0];
      const count = Number(row?.count ?? 0);

      if (count >= rule.limit) {
        const oldest = row?.oldest ? new Date(row.oldest as string | number | Date) : new Date(now);
        const oldestMs = Number.isFinite(oldest.getTime()) ? oldest.getTime() : now;
        return {
          allowed: false,
          remaining: 0,
          retryAfterMs: Math.max(0, oldestMs + rule.windowMs - now),
        };
      }

      await db.$executeRawUnsafe(
        'INSERT INTO "RateLimitHit" (id, bucket, "key", "createdAt") VALUES ($1, $2, $3, $4)',
        `rl-${now}-${randomString(10)}`,
        bucket,
        key,
        new Date(now),
      );

      return { allowed: true, remaining: rule.limit - count - 1, retryAfterMs: 0 };
    },
  };
}

/** Store in-memory bersama (fallback); dipertahankan agar state mudah dibersihkan saat uji. */
let memoryStore = createMemoryStore();

/** Store aktif — default PostgreSQL. Dapat diganti lewat setRateLimitStore (pengujian). */
let activeStore: RateLimitStore | null = null;

async function getStore(): Promise<RateLimitStore> {
  if (activeStore) return activeStore;
  const { prisma } = await import("@/lib/db/prisma");
  activeStore = createPostgresStore(prisma as unknown as RateLimitDb);
  return activeStore;
}

/** Ganti store aktif (dipakai pengujian). Kirim `null` untuk kembali ke default DB. */
export function setRateLimitStore(store: RateLimitStore | null): void {
  activeStore = store;
}

/** Kategori endpoint AI yang dibatasi (per pengguna). */
export type AiBucket = "formula" | "scan" | "help" | "embedding";

const HOUR = 60 * 60 * 1000;

const RULES: Record<AiBucket, RateLimitRule> = {
  formula: { limit: 30, windowMs: HOUR },
  scan: { limit: 15, windowMs: HOUR },
  help: { limit: 40, windowMs: HOUR },
  embedding: { limit: 10, windowMs: HOUR },
};

/**
 * Cek kuota untuk seorang pengguna pada kategori tertentu.
 * Memakai store Postgres; bila gagal, otomatis fallback ke in-memory.
 */
export async function checkAiRateLimit(
  bucket: AiBucket,
  userId: string,
  now?: number,
): Promise<RateLimitResult> {
  const rule = RULES[bucket];
  const at = now ?? Date.now();
  try {
    const store = await getStore();
    return await store.hit(bucket, userId, rule, at);
  } catch (err) {
    console.warn(
      "[rate-limit] store DB gagal; memakai in-memory:",
      err instanceof Error ? err.message : err,
    );
    return memoryStore.hit(bucket, userId, rule, at);
  }
}

/** Aturan yang berlaku (untuk pesan/informasi). */
export function aiRateLimitRule(bucket: AiBucket): RateLimitRule {
  return RULES[bucket];
}

/** Semua aturan rate limit aktif (untuk panel admin). */
export function aiRateLimitRules(): Record<AiBucket, RateLimitRule> {
  return RULES;
}

export interface RateLimitSnapshotRow {
  bucket: string;
  key: string;
  count: number;
  oldest: string | null;
}

/**
 * Rekap pemakaian rate limit per (bucket, key) dalam jendela berjalan.
 * Dipakai panel Monitoring admin; mengembalikan array kosong bila DB gagal.
 */
export async function rateLimitSnapshot(now = Date.now()): Promise<RateLimitSnapshotRow[]> {
  try {
    const { prisma } = await import("@/lib/db/prisma");
    const maxWindow = Math.max(...Object.values(RULES).map((r) => r.windowMs));
    const cutoff = new Date(now - maxWindow);
    const rows = await prisma.$queryRawUnsafe<
      Array<{ bucket: string; key: string; count: number | bigint; oldest: unknown }>
    >(
      'SELECT bucket, "key", COUNT(*)::int AS count, MIN("createdAt") AS oldest FROM "RateLimitHit" WHERE "createdAt" > $1 GROUP BY bucket, "key" ORDER BY count DESC',
      cutoff,
    );
    return rows.map((r) => ({
      bucket: r.bucket,
      key: r.key,
      count: Number(r.count),
      oldest: r.oldest ? new Date(r.oldest as string | number | Date).toISOString() : null,
    }));
  } catch (err) {
    console.warn("[rate-limit] gagal membaca snapshot:", err instanceof Error ? err.message : err);
    return [];
  }
}

/** Bersihkan state store in-memory (dipakai pengujian). Tidak menyentuh tabel DB. */
export function resetAiRateLimits(): void {
  memoryStore = createMemoryStore();
}
