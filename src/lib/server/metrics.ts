/**
 * Pengukur latensi nyata (in-process) untuk panel Monitoring admin.
 * Menyimpan sejumlah sampel terakhir dan menghitung rata-rata bergerak,
 * sehingga metrik "Rata-rata Response" bukan angka acak.
 */
const MAX_SAMPLES = 50;
const samples: number[] = [];

/** Catat satu sampel latensi (ms). */
export function recordLatency(ms: number): void {
  if (!Number.isFinite(ms) || ms < 0) return;
  samples.push(ms);
  if (samples.length > MAX_SAMPLES) samples.shift();
}

/** Rata-rata bergerak latensi dalam ms (0 bila belum ada sampel). */
export function avgLatencyMs(): number {
  if (samples.length === 0) return 0;
  return Math.round(samples.reduce((a, b) => a + b, 0) / samples.length);
}

/** Jumlah sampel yang tersimpan (untuk menandai apakah data sudah cukup). */
export function latencySampleCount(): number {
  return samples.length;
}

/** Uptime proses Node dalam detik. */
export function processUptimeSec(): number {
  return Math.round(process.uptime());
}
