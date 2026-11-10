/* =========================================================
   Verifikasi bank soal.

   Dua lapis:
   1) Pemeriksaan struktur (id unik, topik/level/tipe valid, opsi
      konsisten, jawaban numerik benar-benar numerik).
   2) Menghitung ulang SETIAP jawaban numerik dari rumus aslinya.
      Jika angka yang ditulis di bank soal meleset > 1e-4, skrip gagal.

   Jalankan: npx tsx scripts/verify-questions.ts
   ========================================================= */

import { questions } from "../prisma/questions";

const TOPICS = ["t0", "t1", "t2", "t3", "t4", "t5", "t6", "t7"];
const DIFFS = ["mudah", "sedang", "sulit"];
const TOL = 1e-4;

const failures: string[] = [];
const fail = (message: string) => failures.push(message);

/* ---------- 1) Pemeriksaan struktur ---------- */
const ids = new Set<string>();
const perTopicDiff = new Map<string, number>();

for (const q of questions) {
  if (ids.has(q.id)) fail(`duplikat id ${q.id}`);
  ids.add(q.id);

  if (!TOPICS.includes(q.topicId)) fail(`${q.id}: topicId tidak dikenal (${q.topicId})`);
  if (!DIFFS.includes(q.difficulty)) fail(`${q.id}: difficulty tidak valid (${q.difficulty})`);
  if (!["numeric", "choice", "truefalse"].includes(q.type)) {
    fail(`${q.id}: type tidak valid (${q.type})`);
  }
  if (!q.explanation || q.explanation.trim().length < 10) {
    fail(`${q.id}: penjelasan terlalu pendek`);
  }
  if (/�/.test(q.prompt) || /�/.test(q.explanation)) {
    fail(`${q.id}: mengandung karakter rusak (�)`);
  }

  const key = `${q.topicId}:${q.difficulty}`;
  perTopicDiff.set(key, (perTopicDiff.get(key) ?? 0) + 1);

  if (q.type === "choice" || q.type === "truefalse") {
    if (q.options.length < 2) fail(`${q.id}: jumlah opsi < 2`);
    if (new Set(q.options).size !== q.options.length) fail(`${q.id}: ada opsi duplikat`);
    if (!q.options.includes(q.expectedAnswer)) {
      fail(`${q.id}: expectedAnswer bukan salah satu opsi`);
    }
  }

  if (q.type === "truefalse" && q.options.join("|") !== "Benar|Salah") {
    fail(`${q.id}: opsi truefalse harus tepat ["Benar", "Salah"]`);
  }

  if (q.type === "numeric") {
    if (!/^-?\d+(\.\d+)?(;-?\d+(\.\d+)?)*$/.test(q.expectedAnswer)) {
      fail(`${q.id}: expectedAnswer numerik tidak valid (${q.expectedAnswer})`);
    }
  }
}

for (const topic of TOPICS) {
  for (const diff of DIFFS) {
    const count = perTopicDiff.get(`${topic}:${diff}`) ?? 0;
    if (count !== 5) fail(`${topic}/${diff}: ada ${count} soal, seharusnya 5`);
  }
}

/* ---------- 2) Hitung ulang jawaban numerik ---------- */
const checks: Record<string, () => number | number[]> = {
  /* t0 */
  "q-t0-1": () => 3 ** 2 + 2 * (-1) ** 2,
  "q-t0-2": () => Math.hypot(3 - 1, -1 - 2, 6 - 2),
  "q-t0-4": () => 4 * Math.sin(Math.PI / 3),
  "q-t0-6": () => Math.hypot(-2, 2),
  "q-t0-8": () => Math.sqrt(3 ** 2 + 4 ** 2 - 4),
  "q-t0-10": () => 4,
  "q-t0-11": () => Math.abs(2 * 1 - 2 + 2 * 3 - 4) / Math.hypot(2, -1, 2),
  "q-t0-13": () => 2 * Math.cos(Math.PI / 3),
  "q-t0-14": () => (0 - 3) / 2,

  /* t1 */
  "q-t1-1": () => [2 ** 2, 3 * 2, 2 + 1],
  "q-t1-2": () => 2,
  "q-t1-4": () => 3,
  "q-t1-6": () => Math.hypot(1, 4),
  "q-t1-7": () => [1 / 2, 1],
  "q-t1-8": () => [-Math.sin(Math.PI / 2), Math.cos(Math.PI / 2)],
  "q-t1-10": () => Math.hypot(1, 1),
  "q-t1-11": () => Math.abs(1 * 2 - 0 * 0) / (1 ** 2 + 0 ** 2) ** 1.5,
  "q-t1-12": () => [Math.cos(Math.PI / 2), Math.sin(Math.PI / 2), Math.PI / 2],
  "q-t1-13": () => Math.hypot(1, -1),

  /* t2 */
  "q-t2-1": () => 2 ** 2 + 3,
  "q-t2-2": () => 0,
  "q-t2-6": () => 1,
  "q-t2-7": () => 0,
  "q-t2-9": () => 0,
  "q-t2-10": () => 0,
  "q-t2-11": () => 1,
  "q-t2-13": () => 0,
  "q-t2-14": () => 1,

  /* t3 */
  "q-t3-1": () => 6 * 1 * 2,
  "q-t3-2": () => 2 * 2,
  "q-t3-3": () => 6 * 1 ** 2 * 1,
  "q-t3-6": () => 3,
  "q-t3-7": () => 0 * Math.E ** 0,
  "q-t3-8": () => 2 * 1,
  "q-t3-9": () => 6 / Math.SQRT2,
  "q-t3-11": () => 4 * 1 * 1,
  "q-t3-12": () => Math.hypot(2, 2),
  "q-t3-13": () => 3 * (3 / 5) + 2 * (4 / 5),
  "q-t3-14": () => 6 * 1 + 6 * 1,

  /* t4 */
  "q-t4-1": () => 4 * 1,
  "q-t4-2": () => 0.5 + 0.5,
  "q-t4-3": () => 2 * 2 * 0.1,
  "q-t4-6": () => 0,
  "q-t4-7": () => 2 * 1 * 2 * 0.1 + 1 ** 2 * 0.2,
  "q-t4-8": () => 6 * 1 ** 2,
  "q-t4-10": () => 1 + 1 + 1,
  "q-t4-11": () => -3 / 4,
  "q-t4-12": () => {
    const x = 3;
    const y = 3;
    const fx = 3 * x ** 2 - 6 * y;
    const fy = 3 * y ** 2 - 6 * x;
    return -fx / fy;
  },
  "q-t4-13": () => 2 * 0.1 + 3 * 0.2 + 1 * 0.3,
  "q-t4-14": () => 3 * (2 * 1) + 4 * (3 * 1 ** 2),

  /* t5 */
  "q-t5-2": () => -5,
  "q-t5-3": () => 4,
  "q-t5-5": () => 1,
  "q-t5-8": () => 1 + 1 - 3,
  "q-t5-9": () => 1 / 4 + 1 / 4,
  "q-t5-10": () => 1 + 2 * 2,
  "q-t5-12": () => 2 ** 2 + 4 ** 2,
  "q-t5-13": () => 1 + 1 + 1,
  "q-t5-14": () => 2 * 2 - 1 ** 2,

  /* t6 */
  "q-t6-1": () => 3,
  "q-t6-2": () => 1 / 6,
  "q-t6-3": () => 2,
  "q-t6-6": () => 1 / 3 + 1 / 3,
  "q-t6-7": () => 1 / 3,
  "q-t6-8": () => 0.5 * 0.5,
  "q-t6-9": () => 1 / 2,
  "q-t6-11": () => (Math.E - 1) ** 2,
  "q-t6-12": () => (Math.E - 1) / 2,
  "q-t6-13": () => 1 / 6,
  "q-t6-14": () => 1,

  /* t7 */
  "q-t7-1": () => 1,
  "q-t7-2": () => 2 * Math.PI,
  "q-t7-3": () => (4 * Math.PI) / 3,
  "q-t7-6": () => (32 * Math.PI) / 3,
  "q-t7-8": () => (4 * Math.PI) / 3,
  "q-t7-9": () => Math.PI,
  "q-t7-10": () => Math.PI,
  "q-t7-11": () => (2 * Math.PI) / 3,
  "q-t7-12": () => 1.5,
  "q-t7-13": () => 12 * Math.PI,
  "q-t7-14": () => 3 / 8,
};

for (const q of questions) {
  if (q.type !== "numeric") continue;
  const compute = checks[q.id];
  if (!compute) {
    fail(`${q.id}: belum ada fungsi verifikasi numerik`);
    continue;
  }

  const expected = q.expectedAnswer.split(";").map(Number);
  const computed = compute();
  const actual = Array.isArray(computed) ? computed : [computed];

  if (actual.length !== expected.length) {
    fail(`${q.id}: jumlah komponen beda (hitung ${actual.length}, tulis ${expected.length})`);
    continue;
  }

  actual.forEach((value, index) => {
    if (!Number.isFinite(value) || Math.abs(value - expected[index]) > TOL) {
      fail(`${q.id}: komponen ${index + 1} dihitung ${value}, tetapi ditulis ${expected[index]}`);
    }
  });
}

/* ---------- Ringkasan ---------- */
const numericCount = questions.filter((q) => q.type === "numeric").length;
if (failures.length > 0) {
  console.error(`GAGAL: ${failures.length} masalah ditemukan.`);
  for (const message of failures) console.error(` - ${message}`);
  process.exit(1);
}

console.log(
  `OK: ${questions.length} soal valid; ${numericCount} jawaban numerik dihitung ulang dan cocok.`,
);
