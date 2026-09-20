/* =========================================================
   Seed data VisualMath AI (mock)
   Dibuat deterministik agar demo konsisten.
   ========================================================= */
import type {
  ActivityLog,
  AIConfig,
  HistoryRecord,
  Kelas,
  MaterialItem,
  Progress,
  Question,
  Topic,
  User,
} from "@/lib/types";
import { db } from "@/lib/db/store";

const ts = (daysAgo: number, hour = 9): string => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, 15, 0, 0);
  return d.toISOString();
};

export function seed(): void {
  if (db.users.length > 0) return;

  /* ---------- Users ---------- */
  const users = [
    {
      id: "u-admin",
      name: "Admin VisualMath",
      email: "admin@visualmath.ai",
      password: "admin123",
      role: "admin",
      color: "#3525cd",
      createdAt: ts(60),
    },
    {
      id: "u-dosen1",
      name: "Dr. Sulaiman Yusran, M.Si.",
      email: "dosen@visualmath.ai",
      password: "dosen123",
      role: "dosen",
      prodi: "Matematika",
      color: "#006a61",
      createdAt: ts(55),
    },
    {
      id: "u-dosen2",
      name: "Prof. Ratna Kartika, Ph.D.",
      email: "ratna@visualmath.ai",
      password: "ratna123",
      role: "dosen",
      prodi: "Matematika",
      color: "#95002b",
      createdAt: ts(52),
    },
    {
      id: "u-m0",
      name: "Maria Teofani Evernita Sagala",
      email: "maria@students.uns.ac.id",
      password: "maria123",
      role: "mahasiswa",
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
      password: "yusuf123",
      role: "mahasiswa",
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
      password: "alya123",
      role: "mahasiswa",
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
      password: "rizky123",
      role: "mahasiswa",
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
      password: "nadia123",
      role: "mahasiswa",
      nim: "V3925033",
      prodi: "D3 Teknik Informatika",
      kelasId: "k2",
      color: "#795400",
      createdAt: ts(25),
    },
  ] as unknown as User[];
  db.users.push(...users);

  /* ---------- Kelas ---------- */
  const kelas = [
    {
      id: "k1",
      kode: "IF-2104-A",
      nama: "Kelas A — Kalkulus Peubah Banyak",
      dosenId: "u-dosen1",
      mahasiswaIds: ["u-m0", "u-m1", "u-m2"],
      createdAt: ts(30),
    },
    {
      id: "k2",
      kode: "IF-2103-B",
      nama: "Kelas B — Matematika Lanjut",
      dosenId: "u-dosen2",
      mahasiswaIds: ["u-m3", "u-m4"],
      createdAt: ts(30),
    },
  ] as unknown as Kelas[];
  db.kelas.push(...kelas);

  /* ---------- Topik ---------- */
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
      questionCount: 4,
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
      questionCount: 4,
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
      questionCount: 4,
      order: 2,
    },
    {
      id: "t3",
      slug: "turunan-parsial-gradien",
      title: "Turunan Parsial & Gradien",
      subtitle: "Laju perubahan pada arah tertentu",
      description:
        "Turunan parsial orde satu & dua, teorema Clairaut, gradien, dan turunan berarah.",
      icon: "gradient",
      color: "#00668f",
      formulaCount: 5,
      questionCount: 5,
      order: 3,
    },
    {
      id: "t4",
      slug: "diferensial-aturan-rantai",
      title: "Diferensial & Aturan Rantai",
      subtitle: "Perambatan perubahan antar peubah",
      description:
        "Diferensial total, aturan rantai multivariabel, dan turunan fungsi implisit.",
      icon: "chain",
      color: "#795400",
      formulaCount: 3,
      questionCount: 3,
      order: 4,
    },
    {
      id: "t5",
      slug: "ekstrem-optimasi",
      title: "Ekstrem Lokal & Global (Optimasi)",
      subtitle: "Titik kritis dan uji turunan kedua",
      description:
        "Titik kritis, uji turunan kedua, ekstrem terkendala dengan pengali Lagrange.",
      icon: "auto_awesome",
      color: "#1b7f3b",
      formulaCount: 3,
      questionCount: 4,
      order: 5,
    },
    {
      id: "t6",
      slug: "integral-lipat-dua",
      title: "Integral Lipat Dua",
      subtitle: "Luas & volume melalui pengintegralan iterasi",
      description:
        "Integral ganda atas daerah persegi panjang dan umum; perubahan urutan integrasi.",
      icon: "calculate",
      color: "#5b21b6",
      formulaCount: 3,
      questionCount: 4,
      order: 6,
    },
    {
      id: "t7",
      slug: "integral-lipat-tiga-polar",
      title: "Integral Lipat Tiga & Koordinat Polar",
      subtitle: "Volume dan massa benda 3D",
      description:
        "Integral trippel, koordinat silinder & bola, serta aplikasi pada pusat massa.",
      icon: "orbit",
      color: "#be185d",
      formulaCount: 2,
      questionCount: 3,
      order: 7,
    },
  ] as unknown as Topic[];
  db.topics.push(...topics);

  /* ---------- Bank Soal ---------- */
  const q = (
    topicId: string,
    difficulty: Question["difficulty"],
    type: Question["type"],
    prompt: string,
    expectedAnswer: string,
    explanation: string,
    latex?: string,
    options?: string[],
    hint?: string
  ): Question => ({
    id: `q-${topicId}-${difficulty}-${db.questions.length}` as Question["id"],
    topicId: topicId as Question["topicId"],
    difficulty,
    type,
    prompt,
    latex,
    expectedAnswer,
    explanation,
    options,
    hint,
  });

  const questions: Question[] = [
    // t0
    q("t0", "mudah", "numeric", "Diberikan z = x² + y². Hitung nilai z di titik (2, 3).", "13", "Substitusi langsung: (2)² + (3)² = 4 + 9 = 13.", "z = x^2 + y^2"),
    q("t0", "mudah", "choice", "Fungsi f(x, y) = 1/(x² + y²) memiliki domain alami …", "Semua titik (x,y) kecuali (0,0)", "Penyebut x²+y² = 0 hanya ketika x = 0 dan y = 0.", undefined, ["Seluruh bidang R²", "Semua titik (x,y) kecuali (0,0)", "Hanya kuadran pertama", "Hanya lingkaran satuan"]),
    q("t0", "sedang", "numeric", "Jarak antara titik A(1, −2, 3) dan B(4, 2, −1) adalah (bulatkan 4 desimal).", "6.4031", "Jarak = √((4−1)²+(2+2)²+(−1−3)²) = √(9+16+16) = √41 ≈ 6.403124237.", undefined, undefined, "Gunakan rumus jarak ruang."),
    q("t0", "sulit", "choice", "Dalam koordinat polar, persamaan r = 2 sin θ merepresentasikan …", "Lingkaran", "r = 2 sin θ ⇔ r² = 2r sin θ ⇔ x²+y² = 2y ⇔ x²+(y−1)² = 1, sebuah lingkaran berpusat (0,1).", undefined, ["Garis lurus", "Lingkaran", "Parabola", "Hiperbola"]),

    // t1
    q("t1", "mudah", "numeric", "Untuk r(t) = (t, t², t³), komponen kecepatan r'(1) pada sumbu x adalah …", "1", "r'(t) = (1, 2t, 3t²); r'(1) = (1, 2, 3).", "r(t) = (t, t^2, t^3)"),
    q("t1", "mudah", "numeric", "Laju (speed) partikel r(t) = (t, t²) pada t = 1 adalah (4 desimal).", "2.2361", "v = r'(t) = (1, 2t); |v(1)| = √(1+4) = √5 ≈ 2.23607.", undefined, undefined, "Laju = panjang vektor kecepatan."),
    q("t1", "sedang", "numeric", "Laju (speed) partikel r(t) = (3 cos t, 3 sin t) adalah (konstan) = (4 desimal).", "3", "r'(t) = (−3 sin t, 3 cos t); |v| = √(9 sin²t + 9 cos²t) = 3.", undefined, undefined, "Gunakan identitas sin²+cos²=1."),
    q("t1", "sulit", "numeric", "Vektor percepatan r''(t) untuk r(t) = (t², et) pada t = 0 adalah (pisahkan koma, 4 desimal).", "2,1", "r''(t) = (2, et); r''(0) = (2, 1).", undefined, undefined, "Turunkan dua kali komponen per komponen."),

    // t2
    q("t2", "mudah", "numeric", "Nilai limit lim_{(x,y)→(0,0)} (x² + y²) adalah …", "0", "Fungsi polinomial (x²+y²) kontinu dan bernilai 0 di (0,0), substitusi langsung memberi 0.", undefined),
    q("t2", "mudah", "choice", "Nilai limit berikut yang TIDAK ada adalah …", "lim_{(x,y)→(0,0)} xy/(x²+y²)", "Sepanjang y = mx, nilai menjadi m/(1+m²) bergantung pada m sehingga limit tak ada.", undefined, ["lim (x²+y²)", "lim sin(x²+y²)/(x²+y²)", "lim xy/(x²+y²)", "lim (x²−y²)"]),
    q("t2", "sedang", "numeric", "lim_{(x,y)→(0,0)} sin(x²+y²)/(x²+y²) = (4 desimal).", "1", "Dengan u = x²+y² → 0, kita punya sin(u)/u → 1.", undefined, undefined, "Substitusi u = x²+y²."),
    q("t2", "sulit", "choice", "Fungsi f(x,y) = xy/(x²+y²) untuk (x,y)≠(0,0) dan f(0,0)=0 bersifat …", "Tidak kontinu di (0,0)", "Karena limit tak ada di (0,0), f tidak kontinu di titik itu.", undefined, ["Kontinu di (0,0)", "Tidak kontinu di (0,0)", "Kontinu di seluruh R²", "Tidak terdefinisi di R²"]),

    // t3
    q("t3", "mudah", "numeric", "Untuk f(x, y) = 3x²y, nilai ∂f/∂x di titik (1, 2) adalah …", "12", "∂f/∂x = 6xy; di (1,2) = 6·1·2 = 12.", "f(x,y) = 3x^2 y"),
    q("t3", "mudah", "numeric", "Untuk f(x, y) = x² + 3xy, nilai ∂f/∂y di titik (1, 2) adalah …", "3", "∂f/∂y = 3x; di (1,2) = 3.", undefined),
    q("t3", "sedang", "numeric", "Untuk f(x, y) = x² + 3xy + y², nilai ∂²f/∂x∂y (turunan campuran) adalah …", "3", "∂f/∂y = 3x + 2y, lalu ∂/∂x → 3. (Teorema Clairaut)", undefined, undefined, "Turunkan terhadap y dulu, lalu x."),
    q("t3", "sedang", "numeric", "Vektor gradien ∇f di titik (1, 2) untuk f = x² + y² memiliki komponen x = …", "2", "∇f = (2x, 2y); di (1,2) → 2·1 = 2.", undefined),
    q("t3", "sulit", "numeric", "Turunan berarah Duf untuk f = x²+y², u = (1/√2, 1/√2), di (1, 2) adalah (4 desimal).", "4.2426", "Duf = ∇f·u = (2, 4)·(1/√2, 1/√2) = 6/√2 ≈ 4.24264.", undefined, undefined, "Kalikan titik gradien dengan vektor satuan."),

    // t4
    q("t4", "mudah", "numeric", "Jika z = f(x,y), x = t² dan y = t³, maka dz/dt di t = 1 untuk f_x = 2 dan f_y = 3 adalah …", "13", "dz/dt = fx·dx/dt + fy·dy/dt = 2·(2t) + 3·(3t²) = 4·1 + 9·1 = 13.", undefined, undefined, "Aturan rantai multivariabel."),
    q("t4", "sedang", "numeric", "Diferensial total dz untuk f = x²y di (1, 2) dengan dx = 0.1, dy = 0.2 adalah (4 desimal).", "0.6", "fx = 2xy = 4, fy = x² = 1; dz = fx·dx + fy·dy = 4·0.1 + 1·0.2 = 0.6.", undefined, undefined, "dz = fx·dx + fy·dy."),
    q("t4", "sulit", "numeric", "Untuk f(x, y, z) = x²yz, nilai ∂f/∂z di titik (1, 2, 3) adalah …", "2", "∂f/∂z = x²y = 1·2 = 2.", undefined),

    // t5
    q("t5", "mudah", "choice", "Titik kritis f(x, y) = x² + y² di (0,0) adalah …", "Titik minimum lokal", "Matriks Hessian = [[2,0],[0,2]], definit positif → minimum.", undefined, ["Titik maksimum lokal", "Titik minimum lokal", "Titik pelana", "Bukan titik kritis"]),
    q("t5", "sedang", "choice", "f(x, y) = xy memiliki titik pelana di …", "(0, 0)", "Hessian = [[0,1],[1,0]], D = −1 < 0 → pelana.", undefined, ["(1, 1)", "(0, 0)", "(−1, 1)", "Tidak ada"]),
    q("t5", "sedang", "numeric", "Nilai maksimum f(x, y) = 4 − x² − y² adalah …", "4", "Turunan parsial nol di (0,0): f = 4 − 0 − 0 = 4.", undefined),
    q("t5", "sulit", "numeric", "Dengan pengali Lagrange, nilai maksimum dari x+y terkendala x² + y² = 8 adalah (4 desimal).", "4", "x = y = 2 memberi x+y = 4 (cek: 4+4=8).", undefined, undefined, "Gradien f sejajar gradien kendala: (1,1) = λ(2x,2y)."),

    // t6
    q("t6", "mudah", "numeric", "Nilai ∫₀¹∫₀² (x + y) dy dx adalah …", "3", "∫ dy: [xy + y²/2]₀² = 2x + 2; lalu ∫₀¹ (2x+2) dx = 1 + 2 = 3.", "int_0^1 int_0^2 (x+y) dy dx"),
    q("t6", "mudah", "numeric", "Nilai ∫₀¹∫₀¹ x² y dy dx adalah (4 desimal).", "0.1667", "∫₀¹ x² [y²/2]₀¹ dx = ∫₀¹ x²/2 dx = 1/6 ≈ 0.166667.", undefined, undefined, "Integralkan y dulu, lalu x."),
    q("t6", "sedang", "numeric", "Volume di bawah z = x²+y² di atas persegi [0,1]×[0,1] adalah (4 desimal).", "0.6667", "∫₀¹∫₀¹ (x²+y²) dy dx = ∫₀¹ (x² + 1/3) dx = 1/3 + 1/3 = 2/3.", undefined),
    q("t6", "sulit", "choice", "Mengubah urutan integrasi pada ∫₀¹∫₀ˣ f dy dx menghasilkan …", "∫₀¹∫ᵧ¹ f dx dy", "Daerah: 0≤y≤x≤1 ekuivalen dengan 0≤y≤1 dan y≤x≤1.", undefined, ["∫₀¹∫₀ˣ f dx dy", "∫₀¹∫ᵧ¹ f dx dy", "∫₀ˣ∫₀¹ f dy dx", "∫ᵧ¹∫₀¹ f dx dy"]),

    // t7
    q("t7", "mudah", "numeric", "Volume kubus satuan ∫₀¹∫₀¹∫₀¹ dz dy dx adalah …", "1", "1·1·1 = 1.", undefined),
    q("t7", "sedang", "numeric", "Volume silinder r ≤ 1, 0 ≤ z ≤ 2 dalam koordinat polar adalah (pi desimal: 3.1416).", "6.2832", "V = ∫₀²∫₀¹∫₀^{2π} r dθ dr dz = 2π·(1/2)·2 = 2π ≈ 6.2832.", undefined, undefined, "Elemen luas polar: r dr dθ."),
    q("t7", "sulit", "numeric", "Massa benda dengan rapat 1 di kuartal bola x²+y²+z²≤1, z≥0 (koordinat bola) = (4 desimal).", "2.0944", "V = (1/2)·(4π/3) = 2π/3 ≈ 2.09440.", undefined, undefined, "Setengah volume bola satuan."),
  ];
  db.questions.push(...questions);

  for (const t of topics) {
    t.questionCount = questions.filter((x) => x.topicId === t.id).length;
  }

  /* ---------- Progres ---------- */
  const progressRows = [
    { userId: "u-m0", topicId: "t0", mastery: 82, attempts: 6, solved: 5, xp: 120, updatedAt: ts(1) },
    { userId: "u-m0", topicId: "t1", mastery: 64, attempts: 5, solved: 3, xp: 85, updatedAt: ts(2) },
    { userId: "u-m0", topicId: "t2", mastery: 45, attempts: 4, solved: 2, xp: 60, updatedAt: ts(3) },
    { userId: "u-m0", topicId: "t3", mastery: 30, attempts: 3, solved: 1, xp: 40, updatedAt: ts(4) },
    { userId: "u-m0", topicId: "t4", mastery: 15, attempts: 1, solved: 0, xp: 10, updatedAt: ts(5) },
    { userId: "u-m1", topicId: "t0", mastery: 74, attempts: 4, solved: 3, xp: 95, updatedAt: ts(1) },
    { userId: "u-m1", topicId: "t1", mastery: 52, attempts: 4, solved: 2, xp: 60, updatedAt: ts(2) },
    { userId: "u-m1", topicId: "t2", mastery: 38, attempts: 2, solved: 1, xp: 30, updatedAt: ts(3) },
    { userId: "u-m2", topicId: "t0", mastery: 90, attempts: 7, solved: 6, xp: 150, updatedAt: ts(1) },
    { userId: "u-m2", topicId: "t1", mastery: 70, attempts: 5, solved: 4, xp: 100, updatedAt: ts(2) },
    { userId: "u-m2", topicId: "t2", mastery: 55, attempts: 4, solved: 2, xp: 70, updatedAt: ts(3) },
    { userId: "u-m3", topicId: "t0", mastery: 60, attempts: 4, solved: 2, xp: 80, updatedAt: ts(2) },
    { userId: "u-m3", topicId: "t1", mastery: 40, attempts: 3, solved: 1, xp: 50, updatedAt: ts(3) },
    { userId: "u-m4", topicId: "t0", mastery: 66, attempts: 4, solved: 3, xp: 90, updatedAt: ts(1) },
  ] as unknown as Progress[];
  db.progress.push(...progressRows);

  /* ---------- Riwayat ---------- */
  db.history.push(...([
    {
      id: "h-1",
      userId: "u-m0",
      kind: "lesson",
      title: "Modul: Sistem Koordinat & Fungsi Multivariabel",
      summary: "Menyelesaikan materi koordinat kartesius & polar, 12 slide.",
      xp: 30,
      createdAt: ts(1, 19),
    },
    {
      id: "h-2",
      userId: "u-m0",
      kind: "formula",
      title: "Analisis: f(x) = 3x^2 + 2x − 1",
      summary: "AI Step Explainer: 4 langkah turunan, 2 akar, 1 titik minimum.",
      xp: 25,
      createdAt: ts(1, 18),
    },
    {
      id: "h-3",
      userId: "u-m0",
      kind: "quiz",
      title: "Kuis adaptif: Turunan Parsial & Gradien",
      summary: "Skor 60 · 3 dari 5 benar · streak naik ke 3.",
      score: 60,
      xp: 40,
      createdAt: ts(3, 20),
    },
    {
      id: "h-4",
      userId: "u-m0",
      kind: "graph",
      title: "Simulasi: r(t) = (cos t, sin t)",
      summary: "Menggambar kurva parametrik & melacak animasi gerak partikel.",
      xp: 15,
      createdAt: ts(4, 15),
    },
    {
      id: "h-5",
      userId: "u-m1",
      kind: "quiz",
      title: "Kuis adaptif: Sistem Koordinat",
      summary: "Skor 80 · 4 dari 5 benar.",
      score: 80,
      xp: 55,
      createdAt: ts(1, 10),
    },
    {
      id: "h-6",
      userId: "u-m2",
      kind: "lesson",
      title: "Modul: Limit & Kontinuitas",
      summary: "Menyelesaikan materi lintasan-lintasan limit.",
      xp: 35,
      createdAt: ts(2, 9),
    }
  ] as unknown as HistoryRecord[]));

  /* ---------- Materi dari dosen ---------- */
  const materials = [
    {
      id: "mt-1",
      kelasId: "k1",
      topicId: "t0",
      type: "materi",
      title: "Modul 1 — Koordinat Kartesius & Polar",
      content:
        "Ringkasan: konversi (x,y) ↔ (r,θ), fungsi dua peubah z(x,y), domain bersama. Latihan mandiri: gambar z = x² + y².",
      createdBy: "u-dosen1",
      updatedAt: ts(10),
    },
    {
      id: "mt-2",
      kelasId: "k1",
      topicId: "t3",
      type: "materi",
      title: "Gradien & Turunan Berarah",
      content:
        "Gradien ∇f mengarah ke kenaikan tercepat. Duf = ∇f·u. Contoh: f = x²+y² di (1,2).",
      createdBy: "u-dosen1",
      updatedAt: ts(9),
    },
    {
      id: "mt-3",
      kelasId: "k1",
      topicId: "t3",
      type: "soal",
      title: "Kuis: Turunan Parsial (10 soal)",
      content:
        "Soal latihan turunan parsial orde 1 & 2, turunan campuran, gradien. Waktu 20 menit.",
      difficulty: "sedang",
      createdBy: "u-dosen1",
      updatedAt: ts(8),
    },
    {
      id: "mt-4",
      kelasId: "k2",
      topicId: "t6",
      type: "materi",
      title: "Integral Lipat Dua — Dasar",
      content:
        "Definisi integral iterasi, evaluasi daerah persegi panjang, contoh volume di bawah bidang.",
      createdBy: "u-dosen2",
      updatedAt: ts(7),
    },
  ] as unknown as MaterialItem[];
  db.materials.push(...materials);

  /* ---------- Log aktivitas ---------- */
  db.logs.push(...([
    {
      id: "lg-1",
      userId: "u-m0",
      actorName: "Maria Teofani Evernita Sagala",
      action: "login",
      target: "/login",
      severity: "info",
      createdAt: ts(0, 8),
    },
    {
      id: "lg-2",
      userId: "u-m0",
      actorName: "Maria Teofani Evernita Sagala",
      action: "ai.explain",
      target: "f(x) = 3x^2 + 2x − 1",
      severity: "info",
      createdAt: ts(0, 8),
    },
    {
      id: "lg-3",
      userId: "u-m1",
      actorName: "Yusuf Febriansyah",
      action: "quiz.submit",
      target: "Kuis adaptif: Sistem Koordinat",
      severity: "info",
      createdAt: ts(0, 9),
    },
    {
      id: "lg-4",
      userId: "u-dosen1",
      actorName: "Dr. Sulaiman Yusran, M.Si.",
      action: "material.create",
      target: "Modul 1 — Koordinat Kartesius & Polar",
      severity: "info",
      createdAt: ts(1, 10),
    },
    {
      id: "lg-5",
      actorName: "Sistem",
      action: "ai.timeout",
      target: "Latihan adaptif (antrean > 2s)",
      severity: "warning",
      createdAt: ts(2, 14),
    },
    {
      id: "lg-6",
      actorName: "Sistem",
      action: "auth.failed",
      target: "percobaan login akun nonaktif",
      severity: "error",
      createdAt: ts(3, 23),
    }
  ] as unknown as ActivityLog[]));

  /* ---------- Konfigurasi AI ---------- */
  db.aiConfig = {
    id: "cfg-1",
    model: "visualmath-engine-v2",
    temperature: 0.3,
    maxTokens: 2048,
    features: { stepExplain: true, adaptiveQuiz: true, graphSimulation: true },
    systemPrompt:
      "Kamu adalah asisten pengajar kalkulus peubah banyak. Selalu berikan langkah, rumus, dan contoh nyata, serta dorong pemahaman konseptual.",
    updatedAt: ts(5),
  } as AIConfig;
}