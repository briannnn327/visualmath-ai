/* =========================================================
   Prisma seed: VisualMath AI
   Jalankan: npx prisma db seed
   Idempotent: memakai upsert berdasarkan id tetap.
   ========================================================= */
import { config } from "dotenv";
import { hashPassword } from "@/lib/server/password";
import { questions } from "./questions";
import type { Difficulty } from "./questions";

config({ path: [".env", ".env.local"] });

interface SeedMaterial {
  id: string;
  kelasId: string;
  topicId: string;
  type: "materi" | "soal";
  title: string;
  content: string;
  difficulty?: Difficulty;
  createdBy: string;
}

const ts = (daysAgo: number, hour = 9): Date => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, 15, 0, 0);
  return d;
};

const topics = [
  {
    id: "t0",
    slug: "koordinat-fungsi-multivariabel",
    title: "Sistem Koordinat & Fungsi Multivariabel",
    subtitle: "Koordinat kartesius, polar, dan domain fungsi z(x,y)",
    description:
      "Memahami representasi titik pada bidang & ruang, sistem koordinat polar, serta domain dan range fungsi multivariabel.",
    icon: "dashboard",
    color: "#3525cd",
    formulaCount: 4,
    order: 0,
  },
  {
    id: "t1",
    slug: "fungsi-vektor-kurva-parametrik",
    title: "Fungsi Vektor & Kurva Parametrik",
    subtitle: "Gerak partikel pada ruang R³",
    description:
      "Limit, turunan dan integral fungsi vektor r(t); kecepatan, percepatan dan kelengkungan kurva parametrik.",
    icon: "route",
    color: "#006a61",
    formulaCount: 3,
    order: 1,
  },
  {
    id: "t2",
    slug: "limit-kontinuitas",
    title: "Limit & Kontinuitas Fungsi Multivariabel",
    subtitle: "Pendekatan dari segala arah",
    description:
      "Definisi ε-δ, keberadaan limit di berbagai lintasan, serta kontinuitas fungsi dua peubah.",
    icon: "all_inclusive",
    color: "#95002b",
    formulaCount: 2,
    order: 2,
  },
  {
    id: "t3",
    slug: "turunan-parsial-gradien",
    title: "Turunan Parsial & Gradien",
    subtitle: "Laju perubahan pada arah tertentu",
    description: "Turunan parsial orde satu & dua, teorema Clairaut, gradien, dan turunan berarah.",
    icon: "gradient",
    color: "#00668f",
    formulaCount: 5,
    order: 3,
  },
  {
    id: "t4",
    slug: "diferensial-aturan-rantai",
    title: "Diferensial & Aturan Rantai",
    subtitle: "Perambatan perubahan antar peubah",
    description: "Diferensial total, aturan rantai multivariabel, dan turunan fungsi implisit.",
    icon: "chain",
    color: "#795400",
    formulaCount: 3,
    order: 4,
  },
  {
    id: "t5",
    slug: "ekstrem-optimasi",
    title: "Ekstrem Lokal & Global (Optimasi)",
    subtitle: "Titik kritis dan uji turunan kedua",
    description: "Titik kritis, uji turunan kedua, ekstrem terkendala dengan pengali Lagrange.",
    icon: "auto_awesome",
    color: "#1b7f3b",
    formulaCount: 3,
    order: 5,
  },
  {
    id: "t6",
    slug: "integral-lipat-dua",
    title: "Integral Lipat Dua",
    subtitle: "Luas & volume melalui pengintegralan iterasi",
    description: "Integral ganda atas daerah persegi panjang dan umum; perubahan urutan integrasi.",
    icon: "calculate",
    color: "#5b21b6",
    formulaCount: 3,
    order: 6,
  },
  {
    id: "t7",
    slug: "integral-lipat-tiga-polar",
    title: "Integral Lipat Tiga & Koordinat Polar",
    subtitle: "Volume dan massa benda 3D",
    description: "Integral trippel, koordinat silinder & bola, serta aplikasi pada pusat massa.",
    icon: "orbit",
    color: "#be185d",
    formulaCount: 2,
    order: 7,
  },
];
const materials: SeedMaterial[] = [
  {
    id: "mt-1",
    kelasId: "k1",
    topicId: "t0",
    type: "materi",
    title: "Modul 1 — Koordinat Kartesius & Polar",
    content:
      "Konversi koordinat: x = r cos θ, y = r sin θ, r = √(x²+y²), dan θ = arctan(y/x). Fungsi dua peubah z = f(x,y) memiliki domain himpunan pasangan (x,y) yang membuat f terdefinisi. Contoh: f(x,y) = 1/(x²+y²) terdefinisi untuk semua titik kecuali (0,0). Latihan mandiri: gambarkan permukaan z = x² + y².",
    createdBy: "u-dosen1",
  },
  {
    id: "mt-2",
    kelasId: "k1",
    topicId: "t3",
    type: "materi",
    title: "Gradien & Turunan Berarah",
    content:
      "Gradien ∇f = (f_x, f_y) menunjuk arah kenaikan tercepat dan tegak lurus terhadap kurva level. Turunan berarah didefinisikan D_u f = ∇f · u dengan u vektor satuan. Contoh: f = x²+y², ∇f = (2x, 2y); di titik (1,2) gradien adalah (2,4) dan turunan berarah sepanjang u = (1,1)/√2 adalah 6/√2 ≈ 4.2426.",
    createdBy: "u-dosen1",
  },
  {
    id: "mt-3",
    kelasId: "k1",
    topicId: "t2",
    type: "materi",
    title: "Limit & Kontinuitas Multivariabel",
    content:
      "Limit fungsi dua peubah ada hanya jika nilainya sama untuk semua lintasan menuju titik tersebut. Contoh: lim_{(x,y)→(0,0)} xy/(x²+y²) tidak ada karena nilainya bergantung pada kemiringan lintasan y = mx. Fungsi kontinu di suatu titik bila limitnya ada dan sama dengan nilai fungsi di titik itu.",
    createdBy: "u-dosen1",
  },
  {
    id: "mt-4",
    kelasId: "k1",
    topicId: "t3",
    type: "soal",
    title: "Kuis: Turunan Parsial (10 soal)",
    content:
      "Kumpulan soal turunan parsial orde satu dan dua, turunan campuran, serta gradien. Waktu pengerjaan 20 menit.",
    difficulty: "sedang",
    createdBy: "u-dosen1",
  },
  {
    id: "mt-5",
    kelasId: "k2",
    topicId: "t6",
    type: "materi",
    title: "Integral Lipat Dua — Dasar",
    content:
      "Integral lipat dua ∫∫_D f(x,y) dA dihitung sebagai integral iterasi. Untuk daerah persegi [a,b]×[c,d] berlaku ∫_a^b ∫_c^d f(x,y) dy dx. Contoh: volume di bawah z = x²+y² pada persegi [0,1]×[0,1] adalah 2/3.",
    createdBy: "u-dosen2",
  },
  {
    id: "mt-6",
    kelasId: "k2",
    topicId: "t7",
    type: "materi",
    title: "Integral Lipat Tiga & Koordinat Polar",
    content:
      "Dalam koordinat silinder: x = r cos θ, y = r sin θ, z = z, dengan elemen volume r dr dθ dz. Dalam koordinat bola: x = ρ sin φ cos θ, y = ρ sin φ sin θ, z = ρ cos φ, dengan elemen volume ρ² sin φ dρ dφ dθ. Contoh: volume setengah bola satuan adalah 2π/3.",
    createdBy: "u-dosen2",
  },
];

async function main() {
  const { prisma } = await import("@/lib/db/prisma");

  /* ---------- Users (dosen/admin dulu, lalu mahasiswa) ---------- */
  const staff = [
    {
      id: "u-admin",
      name: "Admin VisualMath",
      email: "admin@visualmath.ai",
      password: hashPassword("admin123"),
      role: "admin" as const,
      color: "#3525cd",
      createdAt: ts(60),
    },
    {
      id: "u-dosen1",
      name: "Dr. Sulaiman Yusran, M.Si.",
      email: "dosen@visualmath.ai",
      password: hashPassword("dosen123"),
      role: "dosen" as const,
      prodi: "Matematika",
      color: "#006a61",
      createdAt: ts(55),
    },
    {
      id: "u-dosen2",
      name: "Prof. Ratna Kartika, Ph.D.",
      email: "ratna@visualmath.ai",
      password: hashPassword("ratna123"),
      role: "dosen" as const,
      prodi: "Matematika",
      color: "#95002b",
      createdAt: ts(52),
    },
  ];
  for (const u of staff) {
    await prisma.user.upsert({ where: { id: u.id }, update: u, create: u });
  }

  /* ---------- Kelas ---------- */
  const kelas = [
    {
      id: "k1",
      kode: "IF-2104-A",
      nama: "Kelas A — Kalkulus Peubah Banyak",
      dosenId: "u-dosen1",
      createdAt: ts(30),
    },
    {
      id: "k2",
      kode: "IF-2103-B",
      nama: "Kelas B — Matematika Lanjut",
      dosenId: "u-dosen2",
      createdAt: ts(30),
    },
  ];
  for (const k of kelas) {
    await prisma.kelas.upsert({ where: { id: k.id }, update: k, create: k });
  }

  /* ---------- Mahasiswa ---------- */
  const students = [
    {
      id: "u-m0",
      name: "Maria Teofani Evernita Sagala",
      email: "maria@students.uns.ac.id",
      password: hashPassword("maria123"),
      role: "mahasiswa" as const,
      nim: "V3925048",
      prodi: "D3 Teknik Informatika",
      kelasId: "k1",
      color: "#3525cd",
      createdAt: ts(30),
    },
    {
      id: "u-m1",
      name: "Yusuf Febriansyah",
      email: "yusuf@students.uns.ac.id",
      password: hashPassword("yusuf123"),
      role: "mahasiswa" as const,
      nim: "V3925058",
      prodi: "D3 Teknik Informatika",
      kelasId: "k1",
      color: "#006a61",
      createdAt: ts(30),
    },
    {
      id: "u-m2",
      name: "Alya Putri Maharani",
      email: "alya@students.uns.ac.id",
      password: hashPassword("alya123"),
      role: "mahasiswa" as const,
      nim: "V3925011",
      prodi: "D3 Teknik Informatika",
      kelasId: "k1",
      color: "#95002b",
      createdAt: ts(28),
    },
    {
      id: "u-m3",
      name: "Rizky Adi Pratama",
      email: "rizky@students.uns.ac.id",
      password: hashPassword("rizky123"),
      role: "mahasiswa" as const,
      nim: "V3925022",
      prodi: "D3 Teknik Informatika",
      kelasId: "k2",
      color: "#00668f",
      createdAt: ts(26),
    },
    {
      id: "u-m4",
      name: "Nadia Salsabila",
      email: "nadia@students.uns.ac.id",
      password: hashPassword("nadia123"),
      role: "mahasiswa" as const,
      nim: "V3925033",
      prodi: "D3 Teknik Informatika",
      kelasId: "k2",
      color: "#795400",
      createdAt: ts(25),
    },
  ];
  for (const u of students) {
    await prisma.user.upsert({ where: { id: u.id }, update: u, create: u });
  }

  /* Pengguna seed dianggap sudah terverifikasi email agar tidak muncul banner demo. */
  await prisma.user.updateMany({
    where: { id: { in: ["u-admin", "u-dosen1", "u-dosen2", ...students.map((s) => s.id)] } },
    data: { emailVerifiedAt: new Date() },
  });

  /* ---------- Topik ---------- */
  for (const t of topics) {
    const count = questions.filter((q) => q.topicId === t.id).length;
    const row = { ...t, questionCount: count };
    await prisma.topic.upsert({ where: { id: t.id }, update: row, create: row });
  }

  /* ---------- Bank soal ---------- */
  for (const q of questions) {
    await prisma.question.upsert({ where: { id: q.id }, update: q, create: q });
  }

  /* ---------- Materi ---------- */
  for (const m of materials) {
    await prisma.materialItem.upsert({ where: { id: m.id }, update: m, create: m });
  }

  /* ---------- Progres ---------- */
  const progressRows = [
    {
      userId: "u-m0",
      topicId: "t0",
      mastery: 82,
      attempts: 6,
      solved: 5,
      xp: 120,
      updatedAt: ts(1),
    },
    {
      userId: "u-m0",
      topicId: "t1",
      mastery: 64,
      attempts: 5,
      solved: 3,
      xp: 85,
      updatedAt: ts(2),
    },
    {
      userId: "u-m0",
      topicId: "t2",
      mastery: 45,
      attempts: 4,
      solved: 2,
      xp: 60,
      updatedAt: ts(3),
    },
    {
      userId: "u-m0",
      topicId: "t3",
      mastery: 30,
      attempts: 3,
      solved: 1,
      xp: 40,
      updatedAt: ts(4),
    },
    {
      userId: "u-m0",
      topicId: "t4",
      mastery: 15,
      attempts: 1,
      solved: 0,
      xp: 10,
      updatedAt: ts(5),
    },
    {
      userId: "u-m1",
      topicId: "t0",
      mastery: 74,
      attempts: 6,
      solved: 4,
      xp: 95,
      updatedAt: ts(1),
    },
    {
      userId: "u-m1",
      topicId: "t1",
      mastery: 55,
      attempts: 4,
      solved: 2,
      xp: 70,
      updatedAt: ts(2),
    },
    {
      userId: "u-m2",
      topicId: "t0",
      mastery: 90,
      attempts: 8,
      solved: 7,
      xp: 150,
      updatedAt: ts(1),
    },
    {
      userId: "u-m3",
      topicId: "t0",
      mastery: 60,
      attempts: 4,
      solved: 2,
      xp: 80,
      updatedAt: ts(2),
    },
    {
      userId: "u-m4",
      topicId: "t0",
      mastery: 66,
      attempts: 4,
      solved: 3,
      xp: 90,
      updatedAt: ts(1),
    },
  ];
  for (const p of progressRows) {
    await prisma.progress.upsert({
      where: { userId_topicId: { userId: p.userId, topicId: p.topicId } },
      update: p,
      create: p,
    });
  }

  /* ---------- Riwayat ---------- */
  const historyRows = [
    {
      id: "h-1",
      userId: "u-m0",
      kind: "lesson" as const,
      title: "Modul: Sistem Koordinat & Fungsi Multivariabel",
      summary: "Menyelesaikan materi koordinat kartesius & polar, 12 slide.",
      xp: 30,
      createdAt: ts(1, 19),
    },
    {
      id: "h-2",
      userId: "u-m0",
      kind: "formula" as const,
      title: "Analisis: f(x) = 3x^2 + 2x − 1",
      summary: "AI Step Explainer: 4 langkah turunan, 2 akar, 1 titik minimum.",
      xp: 25,
      createdAt: ts(1, 18),
    },
    {
      id: "h-3",
      userId: "u-m0",
      kind: "quiz" as const,
      title: "Kuis adaptif: Turunan Parsial & Gradien",
      summary: "Skor 60 · 9 dari 15 benar.",
      score: 60,
      xp: 40,
      createdAt: ts(3, 20),
    },
    {
      id: "h-4",
      userId: "u-m0",
      kind: "graph" as const,
      title: "Simulasi: r(t) = (cos t, sin t)",
      summary: "Menggambar kurva parametrik & animasi gerak partikel.",
      xp: 15,
      createdAt: ts(4, 15),
    },
    {
      id: "h-5",
      userId: "u-m1",
      kind: "quiz" as const,
      title: "Kuis adaptif: Sistem Koordinat",
      summary: "Skor 80 · 12 dari 15 benar.",
      score: 80,
      xp: 55,
      createdAt: ts(1, 10),
    },
    {
      id: "h-6",
      userId: "u-m2",
      kind: "lesson" as const,
      title: "Modul: Limit & Kontinuitas",
      summary: "Menyelesaikan materi lintasan limit.",
      xp: 35,
      createdAt: ts(2, 9),
    },
  ];
  for (const h of historyRows) {
    await prisma.historyRecord.upsert({ where: { id: h.id }, update: h, create: h });
  }

  /* ---------- Log aktivitas ---------- */
  const logRows = [
    {
      id: "lg-1",
      userId: "u-m0",
      actorName: "Maria Teofani Evernita Sagala",
      action: "auth.login",
      target: "/login",
      severity: "info" as const,
      createdAt: ts(0, 8),
    },
    {
      id: "lg-2",
      userId: "u-m0",
      actorName: "Maria Teofani Evernita Sagala",
      action: "ai.explain",
      target: "f(x) = 3x^2 + 2x − 1",
      severity: "info" as const,
      createdAt: ts(0, 8),
    },
    {
      id: "lg-3",
      userId: "u-m1",
      actorName: "Yusuf Febriansyah",
      action: "quiz.submit",
      target: "Kuis adaptif: Sistem Koordinat",
      severity: "info" as const,
      createdAt: ts(0, 9),
    },
    {
      id: "lg-4",
      userId: "u-dosen1",
      actorName: "Dr. Sulaiman Yusran, M.Si.",
      action: "material.create",
      target: "Modul 1 — Koordinat Kartesius & Polar",
      severity: "info" as const,
      createdAt: ts(1, 10),
    },
    {
      id: "lg-5",
      actorName: "Sistem",
      action: "ai.timeout",
      target: "Latihan adaptif (antrean > 2s)",
      severity: "warning" as const,
      createdAt: ts(2, 14),
    },
    {
      id: "lg-6",
      actorName: "Sistem",
      action: "auth.failed",
      target: "percobaan login akun nonaktif",
      severity: "error" as const,
      createdAt: ts(3, 23),
    },
  ];
  for (const l of logRows) {
    await prisma.activityLog.upsert({ where: { id: l.id }, update: l, create: l });
  }

  /* ---------- Konfigurasi AI ---------- */
  const cfg = {
    id: "cfg-1",
    provider: "gemini",
    model: "gemini-3.8-flash",
    temperature: 0.3,
    maxTokens: 2048,
    stepExplain: true,
    adaptiveQuiz: true,
    graphSimulation: true,
    systemPrompt:
      "Kamu adalah asisten pengajar kalkulus peubah banyak. Selalu berikan langkah, rumus, dan contoh nyata, serta dorong pemahaman konseptual.",
  };
  await prisma.aIConfig.upsert({ where: { id: cfg.id }, update: cfg, create: cfg });

  /* ---------- Embedding materi (RAG) ---------- */
  const { reindexMaterial } = await import("@/lib/ai/rag");
  let embedded = 0;
  for (const m of materials) {
    const ok = await reindexMaterial(m.id, m.title, m.content);
    if (ok) embedded++;
  }
  console.log(`Seed selesai. Embedding materi: ${embedded}/${materials.length}.`);

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("[seed] gagal:", err);
  process.exit(1);
});
