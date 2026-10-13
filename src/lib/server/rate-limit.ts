/* =========================================================
   Rate limiter sliding-window in-memory (per proses server).
   Dipakai untuk membatasi pemakaian endpoint AI agar kuota LLM
   tidak cepat habis. Bukan lintas-instance; cukup untuk deploy
   satu proses (dev/uji). Ganti store bila butuh multi-instance.
   ========================================================= */

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

/** Kategori endpoint AI yang dibatasi (per pengguna). */
export type AiBucket = "formula" | "scan" | "help" | "embedding";

const HOUR = 60 * 60 * 1000;

const RULES: Record<AiBucket, RateLimitRule> = {
  formula: { limit: 30, windowMs: HOUR },
  scan: { limit: 15, windowMs: HOUR },
  help: { limit: 40, windowMs: HOUR },
  embedding: { limit: 10, windowMs: HOUR },
};

const LIMITERS: Record<AiBucket, SlidingWindowLimiter> = {
  formula: new SlidingWindowLimiter(RULES.formula),
  scan: new SlidingWindowLimiter(RULES.scan),
  help: new SlidingWindowLimiter(RULES.help),
  embedding: new SlidingWindowLimiter(RULES.embedding),
};

/** Cek kuota untuk seorang pengguna pada kategori tertentu. */
export function checkAiRateLimit(bucket: AiBucket, userId: string, now?: number): RateLimitResult {
  return LIMITERS[bucket].check(userId, now);
}

/** Aturan yang berlaku (untuk pesan/informasi). */
export function aiRateLimitRule(bucket: AiBucket): RateLimitRule {
  return RULES[bucket];
}

/** Bersihkan state limiter (dipakai pengujian). */
export function resetAiRateLimits(bucket?: AiBucket): void {
  if (bucket === undefined) {
    for (const limiter of Object.values(LIMITERS)) limiter.reset();
  } else {
    LIMITERS[bucket].reset();
  }
}
