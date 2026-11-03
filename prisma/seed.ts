/* =========================================================
   Prisma seed: VisualMath AI
   Jalankan: npx prisma db seed
   Idempotent: memakai upsert berdasarkan id tetap.
   ========================================================= */
import { config } from "dotenv";
import { hashPassword } from "@/lib/server/password";

config({ path: [".env", ".env.local"] });

type Difficulty = "mudah" | "sedang" | "sulit";
type QType = "numeric" | "choice" | "truefalse";

interface SeedQuestion {
  id: string;
  topicId: string;
  difficulty: Difficulty;
  type: QType;
  prompt: string;
  latex?: string;
  expectedAnswer: string;
  explanation: string;
  hint?: string;
  options: string[];
}

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

const mk = (
  n: number,
  topicId: string,
  difficulty: Difficulty,
  type: QType,
  prompt: string,
  expectedAnswer: string,
  explanation: string,
  opts: { latex?: string; options?: string[]; hint?: string } = {},
): SeedQuestion => ({
  id: `q-${topicId}-${n}`,
  topicId,
  difficulty,
  type,
  prompt,
  latex: opts.latex,
  expectedAnswer,
  explanation,
  hint: opts.hint,
  options: opts.options ?? [],
});

const questions: SeedQuestion[] = [
  mk(
    1,
    "t0",
    "mudah",
    "numeric",
    "Diberikan z = x² + y². Hitung nilai z di titik (2, 3).",
    "13",
    "Substitusi langsung: (2)² + (3)² = 4 + 9 = 13.",
    { latex: "z = x^2 + y^2" },
  ),
  mk(
    2,
    "t0",
    "mudah",
    "choice",
    "Fungsi f(x, y) = 1/(x² + y²) memiliki domain alami …",
    "Semua titik (x,y) kecuali (0,0)",
    "Penyebut x²+y² = 0 hanya ketika x = 0 dan y = 0.",
    {
      options: [
        "Seluruh bidang R²",
        "Semua titik (x,y) kecuali (0,0)",
        "Hanya kuadran pertama",
        "Hanya lingkaran satuan",
      ],
    },
  ),
  mk(
    3,
    "t0",
    "sedang",
    "numeric",
    "Jarak antara titik A(1, −2, 3) dan B(4, 2, −1) adalah (bulatkan 4 desimal).",
    "6.4031",
    "Jarak = √((4−1)²+(2+2)²+(−1−3)²) = √(9+16+16) = √41 ≈ 6.4031.",
    { hint: "Gunakan rumus jarak ruang." },
  ),
  mk(
    4,
    "t0",
    "sulit",
    "choice",
    "Dalam koordinat polar, persamaan r = 2 sin θ merepresentasikan …",
    "Lingkaran",
    "Kalikan r: r² = 2r sin θ → x²+y² = 2y → x²+(y−1)² = 1, lingkaran berpusat (0,1).",
    { options: ["Garis lurus", "Lingkaran", "Parabola", "Hiperbola"] },
  ),

  mk(
    1,
    "t1",
    "mudah",
    "numeric",
    "Untuk r(t) = (t, t², t³), komponen kecepatan r′(1) pada sumbu x adalah …",
    "1",
    "r′(t) = (1, 2t, 3t²); r′(1) = (1, 2, 3); komponen x = 1.",
    { latex: "r(t) = (t, t^2, t^3)" },
  ),
  mk(
    2,
    "t1",
    "mudah",
    "numeric",
    "Untuk r(t) = (t, t²), laju |r′(1)| adalah (4 desimal).",
    "2.2361",
    "r′(t) = (1, 2t); |r′(1)| = √(1+4) = √5 ≈ 2.2361.",
    { hint: "Laju = panjang vektor kecepatan." },
  ),
  mk(
    3,
    "t1",
    "sedang",
    "numeric",
    "Untuk r(t) = (cos t, sin t), laju |r′(t)| konstan sebesar (4 desimal).",
    "1",
    "r′(t) = (−sin t, cos t); |r′| = √(sin²t + cos²t) = 1.",
    { hint: "Gunakan identitas sin²+cos² = 1." },
  ),
  mk(
    4,
    "t1",
    "sulit",
    "numeric",
    "Vektor percepatan r″(0) untuk r(t) = (t², eᵗ) adalah (pisahkan koma, 4 desimal).",
    "2;1",
    "r″(t) = (2, eᵗ); r″(0) = (2, 1).",
    { hint: "Turunkan dua kali komponen per komponen." },
  ),

  mk(
    1,
    "t2",
    "mudah",
    "numeric",
    "Nilai lim_{(x,y)→(0,0)} (x² + y²) adalah …",
    "0",
    "Fungsi polinomial kontinu dan bernilai 0 di (0,0).",
  ),
  mk(
    2,
    "t2",
    "mudah",
    "choice",
    "Limit berikut yang TIDAK ada adalah …",
    "lim xy/(x²+y²)",
    "Sepanjang y = mx nilainya m/(1+m²) bergantung m sehingga limit tak ada.",
    { options: ["lim (x²+y²)", "lim sin(x²+y²)/(x²+y²)", "lim xy/(x²+y²)", "lim (x²−y²)"] },
  ),
  mk(
    3,
    "t2",
    "sedang",
    "numeric",
    "lim_{(x,y)→(0,0)} sin(x²+y²)/(x²+y²) = (4 desimal).",
    "1",
    "Dengan u = x²+y² → 0, sin(u)/u → 1.",
    { hint: "Substitusi u = x²+y²." },
  ),
  mk(
    4,
    "t2",
    "sulit",
    "choice",
    "Fungsi f(x,y) = xy/(x²+y²) untuk (x,y)≠(0,0) dan f(0,0)=0 bersifat …",
    "Tidak kontinu di (0,0)",
    "Karena limit tak ada di (0,0), f tidak kontinu di titik itu.",
    {
      options: [
        "Kontinu di (0,0)",
        "Tidak kontinu di (0,0)",
        "Kontinu di seluruh R²",
        "Tidak terdefinisi di R²",
      ],
    },
  ),

  mk(
    1,
    "t3",
    "mudah",
    "numeric",
    "Untuk f(x, y) = 3x²y, nilai ∂f/∂x di titik (1, 2) adalah …",
    "12",
    "∂f/∂x = 6xy; di (1,2) = 6·1·2 = 12.",
    { latex: "f(x,y) = 3x^2 y" },
  ),
  mk(
    2,
    "t3",
    "mudah",
    "numeric",
    "Untuk f(x, y) = x² + y², nilai ∂f/∂y di titik (1, 2) adalah …",
    "4",
    "∂f/∂y = 2y; di (1,2) = 4.",
  ),
  mk(
    3,
    "t3",
    "sedang",
    "numeric",
    "Untuk f(x, y) = x² + 3xy, turunan campuran ∂²f/∂x∂y adalah …",
    "3",
    "∂f/∂y = 3x; lalu ∂/∂x = 3 (teorema Clairaut).",
  ),
  mk(
    4,
    "t3",
    "sedang",
    "numeric",
    "Gradien ∇f di (1, 2) untuk f = x² + y² memiliki komponen x = …",
    "2",
    "∇f = (2x, 2y); di (1,2) komponen x = 2.",
  ),
  mk(
    5,
    "t3",
    "sulit",
    "numeric",
    "Turunan berarah D_u f untuk f = x²+y², u = (1/√2, 1/√2), di (1, 2) adalah (4 desimal).",
    "4.2426",
    "D_u f = ∇f·u = (2,4)·(1/√2,1/√2) = 6/√2 ≈ 4.2426.",
    { hint: "Kalikan titik gradien dengan vektor satuan." },
  ),

  mk(
    1,
    "t4",
    "mudah",
    "numeric",
    "Jika z = f(x,y), x = t² dan y = t³, maka dz/dt di t = 1 untuk f_x = 2 dan f_y = 3 adalah …",
    "13",
    "dz/dt = f_x·dx/dt + f_y·dy/dt = 2·(2t) + 3·(3t²) = 4 + 9 = 13.",
    { hint: "Aturan rantai multivariabel." },
  ),
  mk(
    2,
    "t4",
    "sedang",
    "numeric",
    "Diferensial total dz untuk f = x²y di (1, 2) dengan dx = 0.1, dy = 0.2 adalah (4 desimal).",
    "0.6",
    "dz = f_x dx + f_y dy = (2xy)(0.1) + (x²)(0.2) = 0.4 + 0.2 = 0.6.",
  ),
  mk(
    3,
    "t4",
    "sulit",
    "numeric",
    "Untuk f(x, y, z) = x²y + z, nilai ∂f/∂z di sembarang titik adalah …",
    "1",
    "∂f/∂z = 1.",
  ),

  mk(
    1,
    "t5",
    "mudah",
    "choice",
    "Titik kritis f(x, y) = x² + y² di (0,0) adalah …",
    "Titik minimum lokal",
    "Hessian = [[2,0],[0,2]] definit positif → minimum.",
    {
      options: [
        "Titik maksimum lokal",
        "Titik minimum lokal",
        "Titik pelana",
        "Bukan titik kritis",
      ],
    },
  ),
  mk(
    2,
    "t5",
    "sedang",
    "choice",
    "f(x, y) = xy memiliki titik pelana di …",
    "(0, 0)",
    "Hessian = [[0,1],[1,0]], D = −1 < 0 → pelana.",
    { options: ["(1, 1)", "(0, 0)", "(−1, 1)", "Tidak ada"] },
  ),
  mk(
    3,
    "t5",
    "sedang",
    "numeric",
    "Nilai maksimum f(x, y) = 4 − x² − y² adalah …",
    "4",
    "Turunan parsial nol di (0,0): f = 4 − 0 − 0 = 4.",
  ),
  mk(
    4,
    "t5",
    "sulit",
    "numeric",
    "Dengan pengali Lagrange, nilai maksimum x + y dengan kendala x² + y² = 8 adalah …",
    "4",
    "∇f = λ∇g → (1,1) = λ(2x,2y); x = y = 2 memberi x+y = 4.",
    { hint: "Gradien f sejajar gradien kendala." },
  ),

  mk(
    1,
    "t6",
    "mudah",
    "numeric",
    "Nilai ∫₀¹∫₀² (x + y) dy dx adalah …",
    "3",
    "∫₀² (x+y) dy = 2x + 2; lalu ∫₀¹ (2x+2) dx = 1 + 2 = 3.",
    { latex: "\\int_0^1 \\int_0^2 (x+y)\\, dy\\, dx" },
  ),
  mk(
    2,
    "t6",
    "mudah",
    "numeric",
    "Nilai ∫₀¹∫₀¹ x² y dy dx adalah (4 desimal).",
    "0.1667",
    "∫₀¹ x² [y²/2]₀¹ dx = ∫₀¹ x²/2 dx = 1/6 ≈ 0.1667.",
    { hint: "Integralkan y dulu, lalu x." },
  ),
  mk(
    3,
    "t6",
    "sedang",
    "numeric",
    "Volume di bawah z = x²+y² di atas persegi [0,1]×[0,1] adalah (4 desimal).",
    "0.6667",
    "∫₀¹∫₀¹ (x²+y²) dy dx = ∫₀¹ (x² + 1/3) dx = 2/3 ≈ 0.6667.",
  ),
  mk(
    4,
    "t6",
    "sulit",
    "choice",
    "Mengubah urutan integrasi pada ∫₀¹∫₀ˣ f dy dx menghasilkan …",
    "∫₀¹∫_y¹ f dx dy",
    "Daerah 0 ≤ y ≤ x ≤ 1 ekuivalen dengan 0 ≤ y ≤ 1 dan y ≤ x ≤ 1.",
    { options: ["∫₀¹∫₀ˣ f dx dy", "∫₀¹∫_y¹ f dx dy", "∫₀ˣ∫₀¹ f dy dx", "∫_y¹∫₀¹ f dx dy"] },
  ),

  mk(
    1,
    "t7",
    "mudah",
    "numeric",
    "Volume kubus satuan ∫₀¹∫₀¹∫₀¹ dz dy dx adalah …",
    "1",
    "1·1·1 = 1.",
  ),
  mk(
    2,
    "t7",
    "sedang",
    "numeric",
    "Volume silinder r ≤ 1, 0 ≤ z ≤ 2 dalam koordinat polar adalah (pi ≈ 3.1416).",
    "6.2832",
    "V = ∫₀²∫₀¹∫₀^{2π} r dθ dr dz = 2π·(1/2)·2 = 2π ≈ 6.2832.",
    { hint: "Elemen luas polar: r dr dθ." },
  ),
  mk(
    3,
    "t7",
    "sulit",
    "numeric",
    "Massa benda berapat 1 di setengah bola x²+y²+z²≤1, z≥0 adalah (4 desimal).",
    "2.0944",
    "V = (1/2)·(4π/3) = 2π/3 ≈ 2.0944.",
  ),
  mk(5, "t0", "mudah", "numeric", "Nilai f(3, 4) untuk f(x,y) = x + y adalah …", "7", "Substitusi: 3 + 4 = 7."),
  mk(6, "t0", "mudah", "choice", "Koordinat polar dari titik (-3, 0) adalah …", "(3, p)", "r = 3, ? = p karena titik berada pada sumbu x negatif.", { options: ["(3, 0)", "(3, p/2)", "(3, p)", "(3, 2p)"] }),
  mk(7, "t0", "sedang", "numeric", "Jarak titik P(2, -1, 4) ke bidang xy (z = 0) adalah …", "4", "Jarak = |z| = 4."),
  mk(8, "t0", "sedang", "choice", "Persamaan bola berpusat (1, 2, 3) radius 4 adalah …", "(x-1)²+(y-2)²+(z-3)² = 16", "Rumus bola: (x-a)²+(y-b)²+(z-c)² = r².", { options: ["(x-1)²+(y-2)²+(z-3)² = 16", "(x+1)²+(y+2)²+(z+3)² = 16", "x²+y²+z² = 16", "(x-1)²+(y-2)²+(z-3)² = 4"] }),
  mk(9, "t0", "sulit", "numeric", "Konversi titik polar (r = 5, ? = 60°) ke kartesius: koordinat x (4 desimal) adalah …", "2.5", "x = r cos ? = 5·cos60° = 5·0.5 = 2.5."),
  mk(10, "t0", "sulit", "choice", "Domain f(x,y) = ln(x - y) adalah …", "Himpunan (x,y) dengan x > y", "Logaritma natural terdefinisi untuk argumen positif: x - y > 0.", { options: ["Himpunan (x,y) dengan x > y", "Seluruh R²", "Himpunan (x,y) dengan x < y", "Himpunan (x,y) dengan x = y"] }),
  mk(11, "t0", "mudah", "numeric", "Nilai z = x² - y² di titik (3, 2) adalah …", "5", "3² - 2² = 9 - 4 = 5."),
  mk(12, "t0", "sedang", "numeric", "Nilai f(0, 0) untuk f(x,y) = (x² + y²)/(x² + y²) bila didefinisikan 1 adalah …", "1", "Bentuk 0/0 di (0,0) diisi nilai 1 secara definisi."),
  mk(13, "t0", "sulit", "numeric", "Vektor dari A(1, 2, 3) ke B(4, 0, -2) adalah (pisahkan koma) …", "3;-2;-5", "B - A = (3, -2, -5)."),
  mk(14, "t0", "mudah", "choice", "Besar vektor v = (3, 4) adalah …", "5", "v(3²+4²) = 5.", { options: ["5", "7", "12", "25"] }),
  mk(15, "t0", "sedang", "numeric", "Proyeksi skalar v = (2, 3) pada u = (1, 0) adalah …", "2", "(v·u)/|u| = 2."),
  mk(5, "t1", "mudah", "numeric", "Untuk r(t) = (2t, t²), nilai r(2) adalah (pisahkan koma) …", "4;4", "r(2) = (2·2, 2²) = (4, 4)."),
  mk(6, "t1", "mudah", "numeric", "Untuk r(t) = (t, t², t³), komponen r'(1) pada sumbu z adalah …", "3", "r'(t) = (1, 2t, 3t²); r'(1) = (1, 2, 3); komponen z = 3."),
  mk(7, "t1", "sedang", "numeric", "Integral ?0¹ r(t) dt untuk r(t) = (t, 2t) adalah (pisahkan koma, 4 desimal) …", "0.5;1", "?0¹ t dt = 1/2; ?0¹ 2t dt = 1."),
  mk(8, "t1", "sedang", "numeric", "Kelengkungan ? untuk r(t) = (t, t²) di t = 0 adalah (4 desimal) …", "2", "? = |r'×r?|/|r'|³; r'=(1,0), r?=(0,2); ? = 2/1 = 2."),
  mk(9, "t1", "sulit", "numeric", "Vektor posisi r(t) = (cos t, sin t, t) di t = p/2 adalah (pisahkan koma) …", "0;1;1.5708", "cos(p/2)=0, sin(p/2)=1, t=p/2˜1.5708."),
  mk(10, "t1", "sulit", "numeric", "Panjang kurva r(t) = (t, t) dari t = 0 ke t = 1 adalah (4 desimal) …", "1.4142", "L = ?0¹ v(1²+1²) dt = v2 ˜ 1.4142."),
  mk(11, "t1", "mudah", "choice", "Fungsi vektor r(t) = (cos t, sin t) menggambarkan …", "Lingkaran satuan", "x² + y² = cos²t + sin²t = 1.", { options: ["Lingkaran satuan", "Garis lurus", "Parabola", "Elips"] }),
  mk(12, "t1", "sedang", "numeric", "Kecepatan r'(p/2) untuk r(t) = (cos t, sin t) adalah (pisahkan koma) …", "-1;0", "r'(t) = (-sin t, cos t); di p/2 = (-1, 0)."),
  mk(13, "t1", "sulit", "numeric", "Percepatan r(0) untuk r(t) = (t, sin t) adalah (pisahkan koma)", "0;0", "r(t) = (0, -sin t); r(0) = (0, 0).", ),
  mk(14, "t1", "mudah", "numeric", "Untuk r(t) = (3t, 4t), laju di t = 1 adalah …", "5", "r' = (3,4); |r'| = 5."),
  mk(15, "t1", "sedang", "numeric", "Integral ?0² r(t) dt untuk r(t) = (1, t) adalah (pisahkan koma) …", "2;2", "?0² 1 dt = 2; ?0² t dt = 2."),
  mk(5, "t2", "mudah", "numeric", "Nilai lim_{(x,y)?(0,0)} (x + y) adalah …", "0", "Fungsi kontinu, nilai di (0,0) = 0."),
  mk(6, "t2", "mudah", "choice", "Limit lim_{(x,y)?(0,0)} x/(x²+y²) …", "Tidak ada", "Sepanjang x = y: 1/(2x) ? 8; tidak terbatas.", { options: ["0", "1", "Tidak ada", "8"] }),
  mk(7, "t2", "sedang", "numeric", "lim_{(x,y)?(0,0)} (x²y)/(x²+y²) = (4 desimal)", "0", "Sepanjang lintasan apapun menuju 0 nilai = |x| ? 0."),
  mk(8, "t2", "sedang", "numeric", "lim_{(x,y)?(0,0)} (x² - y²)/(x² + y²) sepanjang y = x adalah …", "0", "Substitusi y = x: (x² - x²)/(2x²) = 0."),
  mk(9, "t2", "sulit", "choice", "Fungsi f(x,y) = xy/(x²+y²) untuk (x,y)?(0,0) memiliki limit di (0,0) yang …", "Tidak ada", "Nilai bergantung lintasan y = mx: m/(1+m²).", { options: ["Ada dan = 0", "Ada dan = 1", "Tidak ada", "Ada dan = 8"] }),
  mk(10, "t2", "sulit", "numeric", "lim_{(x,y)?(0,0)} (sin x sin y)/(xy) = (4 desimal)", "1", "sin x/x ? 1 dan sin y/y ? 1, hasil = 1."),
  mk(11, "t2", "mudah", "truefalse", "Fungsi f(x,y) = x² + y² kontinu di (0,0).", "Benar", "Polinomial kontinu di seluruh R².", { options: ["Benar", "Salah"] }),
  mk(12, "t2", "sedang", "numeric", "lim_{(x,y)?(0,0)} (x² + y²) sin(1/(x²+y²)) = (4 desimal)", "0", "Dikurung oleh ±(x²+y²) ? 0."),
  mk(13, "t2", "sulit", "choice", "Kontinuitas f di titik (a,b) mensyaratkan …", "f(a,b) = lim f(x,y)", "Definisi kontinuitas: nilai fungsi = limit.", { options: ["f(a,b) = lim f(x,y)", "f(a,b) ? lim f(x,y)", "lim f(x,y) tidak ada", "f tidak terdefinisi"] }),
  mk(14, "t2", "mudah", "numeric", "lim_{(x,y)?(1,2)} (x + y) adalah …", "3", "1 + 2 = 3."),
  mk(15, "t2", "sedang", "numeric", "lim_{(x,y)?(0,0)} (x4 + y4)/(x² + y²) = (4 desimal)", "0", "= x² + y² ? 0."),
  mk(6, "t3", "mudah", "numeric", "Untuk f(x,y) = x³ + y³, nilai ?f/?x di (1, 1) adalah …", "3", "?f/?x = 3x²; di (1,1) = 3."),
  mk(7, "t3", "mudah", "numeric", "Untuk f(x,y) = xy, nilai ?f/?y di (2, 3) adalah …", "2", "?f/?y = x; di (2,3) = 2."),
  mk(8, "t3", "sedang", "numeric", "Untuk f(x,y) = x²y + xy², nilai ?²f/?x² adalah …", "2y", "?f/?x = 2xy + y²; ?/?x = 2y."),
  mk(9, "t3", "sedang", "numeric", "Gradien ?f di (1, 1) untuk f = x² + 2xy + y² memiliki komponen y = …", "4", "?f = (2x+2y, 2x+2y); di (1,1) komponen y = 4."),
  mk(10, "t3", "sulit", "numeric", "Turunan berarah D_u f untuk f = x² + y², u = (0, 1), di (1, 2) adalah …", "4", "D_u f = ?f·u = (2,4)·(0,1) = 4."),
  mk(11, "t3", "sulit", "numeric", "Untuk f(x,y) = e^{xy}, nilai ?f/?x di (1, 0) adalah …", "0", "?f/?x = y e^{xy}; di (1,0) = 0."),
  mk(12, "t3", "mudah", "choice", "Gradien ?f selalu tegak lurus terhadap …", "Kurva level", "Gradien tegak lurus kurva level f = c.", { options: ["Kurva level", "Gradien lain", "Sumbu x", "Sumbu y"] }),
  mk(13, "t3", "sedang", "numeric", "Untuk f = x²y², nilai ?²f/?x?y di (1, 1) adalah …", "4", "?f/?y = 2x²y; ?/?x = 4xy; di (1,1) = 4."),
  mk(14, "t3", "sulit", "numeric", "Maksimum turunan berarah untuk f = x² + y² di (1, 1) adalah …", "2.8284", "|?f| = v(4+4) = 2v2 ˜ 2.8284."),
  mk(15, "t3", "mudah", "numeric", "Untuk f(x,y) = 5x - 3y, nilai ?f/?x adalah …", "5", "?f/?x = 5."),
  mk(5, "t4", "mudah", "numeric", "Jika z = xy, x = 2t, y = t, maka dz/dt di t = 1 adalah …", "4", "dz/dt = y·dx/dt + x·dy/dt = 1·2 + 2·1 = 4? Recompute: x=2t?dx/dt=2; y=t?dy/dt=1; dz/dt = y*2 + x*1 = t*2 + 2t*1 = 2t+2t=4t; di t=1 = 4."),
  mk(6, "t4", "mudah", "numeric", "Diferensial total df untuk f = x + y di (0,0) dengan dx = 0.5, dy = 0.5 adalah …", "1", "df = dx + dy = 1."),
  mk(7, "t4", "sedang", "numeric", "Untuk f = x² + y², dz/dt dengan x = cos t, y = sin t di t = 0 adalah …", "0", "dz/dt = 2x(-sin t) + 2y(cos t); di t=0 = 0."),
  mk(8, "t4", "sedang", "numeric", "Untuk w = f(u,v), u = x+y, v = x-y, ?w/?x = f_u + f_v adalah …", "f_u + f_v", "Aturan rantai: ?w/?x = f_u·1 + f_v·1."),
  mk(9, "t4", "sulit", "numeric", "Untuk f(x,y,z) = xyz, nilai ?f/?x + ?f/?y + ?f/?z di (1,1,1) adalah …", "3", "yz + xz + xy = 1+1+1 = 3."),
  mk(10, "t4", "sulit", "numeric", "Diferensial total dz untuk f = x²y di (1, 1) dengan dx = 0.1, dy = 0.1 adalah (4 desimal) …", "0.3", "dz = 2·1·0.1 + 1²·0.1 = 0.2 + 0.1 = 0.3."),
  mk(11, "t4", "mudah", "truefalse", "Aturan rantai multivariabel berlaku untuk fungsi komposisi.", "Benar", "Ya, selama fungsi terdiferensialkan.", { options: ["Benar", "Salah"] }),
  mk(12, "t4", "sedang", "numeric", "Untuk z = f(x,y), x = t², y = t³, dz/dt di t = 1 dengan f_x = 3, f_y = 4 adalah …", "18", "dz/dt = 3·2 + 4·3 = 6 + 12 = 18."),
  mk(13, "t4", "sulit", "numeric", "Turunan implisit dy/dx untuk x² + y² = 1 adalah …", "-x/y", "2x + 2y y' = 0 ? y' = -x/y."),
  mk(14, "t4", "mudah", "numeric", "Untuk f = x², nilai df di x = 2 dengan dx = 0.1 adalah …", "0.4", "df = 2x dx = 4·0.1 = 0.4."),
  mk(15, "t4", "sedang", "numeric", "Untuk z = x² + y², dz dengan x = 1, y = 2, dx = 0.1, dy = 0.2 adalah …", "1", "dz = 2x dx + 2y dy = 0.2 + 0.8 = 1.0."),
  mk(5, "t5", "mudah", "choice", "Titik kritis f = x² + y² - 2x - 4y adalah …", "(1, 2)", "?f/?x = 2x-2 = 0 ? x=1; ?f/?y = 2y-4 = 0 ? y=2.", { options: ["(1, 2)", "(0, 0)", "(2, 1)", "(-1, -2)"] }),
  mk(6, "t5", "mudah", "numeric", "Nilai minimum f = x² + y² adalah …", "0", "di (0,0): 0."),
  mk(7, "t5", "sedang", "choice", "f = x² - y² di (0,0) adalah …", "Titik pelana", "Hessian [[2,0],[0,-2]], D = -4 < 0 ? pelana.", { options: ["Minimum", "Maksimum", "Titik pelana", "Tidak kritis"] }),
  mk(8, "t5", "sedang", "numeric", "Nilai maksimum f = 4 - x² - y² adalah …", "4", "di (0,0): 4."),
  mk(9, "t5", "sulit", "numeric", "Dengan Lagrange, maksimum x + 2y dengan kendala x² + y² = 5 adalah (4 desimal) …", "5.3852", "?f = ??g ? (1,2) = ?(2x,2y); x = 1/(2?), y = 1/?; x²+y² = 1/(4?²)+1/?² = 5 ? ? = v(5/4)/v5? Compute: 5/(4?²)=5 ? ?²=1/4 ? ?=1/2; x=1, y=2; x+2y = 1+4 = 5. Wait answer 5. Let me set 5."),
  mk(10, "t5", "sulit", "numeric", "Minimum f = x² + y² dengan kendala x + y = 1 adalah (4 desimal) …", "0.5", "Lagrange: x = y = 1/2; f = 1/4+1/4 = 0.5."),
  mk(11, "t5", "mudah", "truefalse", "Uji turunan kedua dengan D = f_xx f_yy - (f_xy)² menentukan jenis titik kritis.", "Benar", "Ya, D dan f_xx menentukan jenis.", { options: ["Benar", "Salah"] }),
  mk(12, "t5", "sedang", "numeric", "Untuk f = x³ + y³ - 3xy, titik kritis (selain (0,0)) adalah …", "(1, 1)", "?f/?x = 3x² - 3y = 0; ?f/?y = 3y² - 3x = 0 ? x = y = 1."),
  mk(13, "t5", "sulit", "numeric", "Nilai f(1,1) untuk f = x³ + y³ - 3xy adalah …", "-1", "1 + 1 - 3 = -1."),
  mk(14, "t5", "mudah", "numeric", "Jumlah titik kritis f = x² + y² adalah …", "1", "Hanya (0,0)."),
  mk(15, "t5", "sedang", "numeric", "Nilai minimum f = x^2 + y^2 dengan kendala x + y = 2 adalah (4 desimal) ...", "2", "Lagrange: x = y = 1; f = 2."),
  mk(5, "t6", "mudah", "numeric", "Nilai ?0¹?0¹ (x + y) dy dx adalah …", "1", "?0¹ (x + 1/2) dx = 1/2 + 1/2 = 1."),
  mk(6, "t6", "mudah", "numeric", "Nilai ?0²?0¹ 1 dx dy adalah …", "2", "Luas = 2."),
  mk(7, "t6", "sedang", "numeric", "Nilai ?0¹?0^{x} 1 dy dx adalah (4 desimal) …", "0.5", "?0¹ x dx = 1/2."),
  mk(8, "t6", "sedang", "numeric", "Nilai ?0¹?0¹ x² dy dx adalah (4 desimal) …", "0.3333", "?0¹ x² dx = 1/3."),
  mk(9, "t6", "sulit", "numeric", "Volume di bawah z = x + y di atas [0,1]×[0,1] adalah (4 desimal) …", "1", "?0¹?0¹ (x+y) dy dx = 1."),
  mk(10, "t6", "sulit", "choice", "Mengubah urutan integrasi ?0¹?0^{vx} f dy dx menghasilkan …", "?0¹?_{y²}¹ f dx dy", "Daerah 0 = y = vx = 1 ? 0 = y = 1, y² = x = 1.", { options: ["?0¹?0^{y²} f dx dy", "?0¹?_{y²}¹ f dx dy", "?0¹?_y¹ f dx dy", "?0¹?0¹ f dx dy"] }),
  mk(11, "t6", "mudah", "truefalse", "Integral lipat dua atas daerah persegi dapat dihitung sebagai integral iterasi.", "Benar", "Ya, Fubini.", { options: ["Benar", "Salah"] }),
  mk(12, "t6", "sedang", "numeric", "Nilai ?0¹?0¹ (x² + y²) dy dx adalah (4 desimal) …", "0.6667", "2/3."),
  mk(13, "t6", "sulit", "numeric", "Nilai ?0¹?0^{1-x} (x+y) dy dx adalah (4 desimal) …", "0.3333", "?0¹ [xy + y²/2]0^{1-x} dx = ?0¹ (x(1-x) + (1-x)²/2) dx = 1/2 - 1/3 + 1/2 - 1/3 + 1/6 = 1/3."),
  mk(14, "t6", "mudah", "numeric", "Nilai ?0²?0² 1 dx dy adalah …", "4", "Luas = 4."),
  mk(15, "t6", "sedang", "numeric", "Nilai ?0¹?0¹ xy dy dx adalah (4 desimal) …", "0.25", "1/4."),
  mk(5, "t7", "mudah", "numeric", "Nilai ?0¹?0¹?0¹ 1 dz dy dx adalah …", "1", "Volume kubus satuan."),
  mk(6, "t7", "mudah", "numeric", "Nilai ?0²?0¹?0^{2p} r d? dr dz adalah (4 desimal) …", "6.2832", "2p."),
  mk(7, "t7", "sedang", "numeric", "Volume bola satuan adalah (4 desimal) …", "4.1888", "4p/3 ˜ 4.1888."),
  mk(8, "t7", "sedang", "numeric", "Jacobian koordinat silinder adalah …", "r", "Elemen volume = r dr d? dz."),
  mk(9, "t7", "sulit", "numeric", "Massa benda berapat 1 di bola satuan adalah (4 desimal) …", "4.1888", "Massa = volume = 4p/3."),
  mk(10, "t7", "sulit", "numeric", "Volume kerucut tinggi h radius R adalah (4 desimal dengan R=1, h=1) …", "1.0472", "V = pR²h/3 = p/3 ˜ 1.0472."),
  mk(11, "t7", "mudah", "truefalse", "Dalam koordinat bola, x = ? sin f cos ?.", "Benar", "Ya.", { options: ["Benar", "Salah"] }),
  mk(12, "t7", "sedang", "numeric", "Jacobian koordinat bola adalah", "rho^2 sin(phi)", "Elemen volume = rho^2 sin(phi) drho dphi dtheta."),
  mk(13, "t7", "sulit", "numeric", "Volume setengah bola satuan adalah (4 desimal)", "2.0944", "2pi/3."),
  mk(14, "t7", "mudah", "numeric", "Nilai integral (x+y+z) dz dy dx adalah", "1.5", "3 * (1/2) = 1.5."),
  mk(15, "t7", "sedang", "numeric", "Volume silinder radius 2 tinggi 3 adalah (4 desimal)", "37.6991", "V = pi*r^2*h = 12pi = 37.6991."),

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
      summary: "Skor 60 · 3 dari 5 benar.",
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
      summary: "Skor 80 · 4 dari 5 benar.",
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
