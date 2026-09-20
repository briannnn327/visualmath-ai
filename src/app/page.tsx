import Link from "next/link";
import { Logo } from "@/components/brand";
import { homeFor } from "@/components/layout/nav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Icon, type IconName } from "@/components/ui/icon";
import { getCurrentPublicUser } from "@/lib/server/data";

const features: Array<{ icon: IconName; title: string; desc: string }> = [
  {
    icon: "sparkle",
    title: "AI Step Explainer",
    desc: "Masukkan fungsi apa pun dan dapatkan turunan, langkah penyelesaian, serta penjelasan aturan yang dipakai secara otomatis.",
  },
  {
    icon: "monitoring",
    title: "Grafik Interaktif",
    desc: "Visualisasi kurva fungsi, turunannya, akar, serta titik ekstrem dengan eksplorasi interaktif secara langsung.",
  },
  {
    icon: "target",
    title: "Latihan Adaptif",
    desc: "Kuis yang menyesuaikan tingkat kesulitan dengan penguasaanmu. Setiap jawaban memengaruhi rekomendasi topik berikutnya.",
  },
  {
    icon: "users",
    title: "Monitoring Dosen",
    desc: "Dosen memantau progres kelas, materi ajar, dan statistik penguasaan mahasiswa secara real-time.",
  },
  {
    icon: "gauge",
    title: "Admin Dashboard",
    desc: "Administrator mengelola pengguna, memantau performa AI, serta mengatur konfigurasi sistem dari satu panel.",
  },
  {
    icon: "school",
    title: "Kalkulus Peubah Banyak",
    desc: "Materi lengkap: fungsi multivariabel, vektor, limit, turunan parsial, integral lipat dua & tiga.",
  },
];

function HeroPlot() {
  const fx = (x: number) => x * x;
  return (
    <div className="relative w-full max-w-md">
      <div
        className="absolute -inset-6 rounded-[2.5rem] bg-brand-gradient opacity-20 blur-3xl"
        aria-hidden
      />
      <Card className="relative overflow-hidden">
        <CardContent>
          <div className="mb-3 flex items-center justify-between">
            <Badge variant="primary">
              <Icon name="functions" size={12} />
              f(x) = x²
            </Badge>
            <Badge variant="outline">turunan = 2x</Badge>
          </div>
          <svg viewBox="0 0 320 200" className="h-auto w-full">
            <defs>
              <linearGradient id="plotFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.25" />
                <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0" />
              </linearGradient>
            </defs>
            {Array.from({ length: 7 }, (_, i) => {
              const x = 30 + i * 43;
              return (
                <line
                  key={`v${i}`}
                  x1={x}
                  y1={10}
                  x2={x}
                  y2={190}
                  stroke="var(--color-outline-variant)"
                />
              );
            })}
            {Array.from({ length: 5 }, (_, i) => {
              const y = 20 + i * 42;
              return (
                <line
                  key={`h${i}`}
                  x1={30}
                  y1={y}
                  x2={288}
                  y2={y}
                  stroke="var(--color-outline-variant)"
                />
              );
            })}
            <line x1={30} y1={190} x2={288} y2={190} stroke="var(--color-outline)" />
            <polygon points="30,20 -10,190 288,190" fill="url(#plotFill)" />
            <path
              d={Array.from({ length: 61 }, (_, i) => {
                const x = -2.5 + (i / 60) * 5.5;
                const px = 30 + ((x + 2.5) / 5.5) * 258;
                const py = 190 - ((fx(x) / 8.5) * 170 + 8);
                return `${i === 0 ? "M" : "L"}${px.toFixed(1)},${py.toFixed(1)}`;
              }).join(" ")}
              fill="none"
              stroke="var(--color-primary)"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <path
              d={Array.from({ length: 61 }, (_, i) => {
                const x = -2.5 + (i / 60) * 5.5;
                const px = 30 + ((x + 2.5) / 5.5) * 258;
                const py = 190 - (((2 * x) / 8.5) * 170 + 8);
                return `${i === 0 ? "M" : "L"}${px.toFixed(1)},${py.toFixed(1)}`;
              }).join(" ")}
              fill="none"
              stroke="var(--color-secondary)"
              strokeWidth="2"
              strokeDasharray="5 5"
              strokeLinecap="round"
            />
            <circle
              cx={30 + ((-2.5 + 2.5) / 5.5) * 258}
              cy={190 - ((fx(-2.5) / 8.5) * 170 + 8)}
              r="4"
              fill="var(--color-tertiary)"
            />
          </svg>
        </CardContent>
      </Card>
    </div>
  );
}

export default async function LandingPage() {
  const user = await getCurrentPublicUser();
  const ctaHref = user ? homeFor(user.role) : "/login";

  return (
    <div className="min-h-screen bg-surface">
      {/* Navbar */}
      <header className="sticky top-0 z-40 border-b border-outline-variant bg-surface/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 lg:px-8">
          <Logo />
          <nav className="hidden items-center gap-6 text-sm font-semibold text-on-surface-variant md:flex">
            <a href="#fitur" className="transition-colors hover:text-on-surface">
              Fitur
            </a>
            <a href="#cara" className="transition-colors hover:text-on-surface">
              Cara Kerja
            </a>
            <a href="#modul" className="transition-colors hover:text-on-surface">
              Materi
            </a>
          </nav>
          <div className="flex items-center gap-2">
            {user ? (
              <Link href={ctaHref}>
                <Button>
                  Buka Dashboard
                  <Icon name="arrow-right" size={16} />
                </Button>
              </Link>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost">Masuk</Button>
                </Link>
                <Link href="/register">
                  <Button>Daftar</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-hero-grid" aria-hidden />
        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 py-20 lg:grid-cols-2 lg:px-8 lg:py-28">
          <div>
            <Badge variant="tertiary" className="mb-4">
              <Icon name="sparkle" size={12} />
              Platform Pembelajaran Kalkulus Berbasis AI
            </Badge>
            <h1 className="font-display text-4xl font-extrabold leading-tight tracking-tight text-on-surface sm:text-5xl lg:text-6xl">
              Kuasai Kalkulus
              <span className="text-gradient block">Peubah Banyak</span>
              dengan AI
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-on-surface-variant">
              VisualMath AI menjelaskan setiap langkah penyelesaian, memvisualisasikan fungsi secara
              interaktif, dan melatihmu dengan soal adaptif yang menyesuaikan tingkat penguasaan.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href={user ? ctaHref : "/register"}>
                <Button size="lg">
                  Mulai Belajar Gratis
                  <Icon name="sparkle" size={18} />
                </Button>
              </Link>
              <Link href={ctaHref}>
                <Button size="lg" variant="outline">
                  Coba AI Explainer
                </Button>
              </Link>
            </div>
            <dl className="mt-10 grid max-w-md grid-cols-3 gap-4">
              {[
                ["8", "Topik Inti"],
                ["+30", "Bank Soal"],
                ["×3", "Tingkat Adaptif"],
              ].map(([v, l]) => (
                <div
                  key={l}
                  className="rounded-2xl border border-outline-variant bg-surface-container/60 p-3 text-center"
                >
                  <dt className="font-display text-xl font-extrabold text-primary">{v}</dt>
                  <dd className="text-xs font-medium text-on-surface-variant">{l}</dd>
                </div>
              ))}
            </dl>
          </div>
          <HeroPlot />
        </div>
      </section>

      {/* Fitur */}
      <section id="fitur" className="mx-auto max-w-6xl px-4 py-20 lg:px-8">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <Badge variant="primary" className="mb-3">
            Fitur Unggulan
          </Badge>
          <h2 className="font-display text-3xl font-extrabold text-on-surface">
            Satu platform untuk semua peran
          </h2>
          <p className="mt-3 text-on-surface-variant">
            Dirancang sesuai kebutuhan mahasiswa, dosen, dan administrator kampus.
          </p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <Card
              key={f.title}
              className="transition-all duration-200 hover:-translate-y-1 hover:shadow-card"
            >
              <CardContent className="p-6">
                <span className="mb-4 grid h-11 w-11 place-items-center rounded-2xl bg-primary-container text-on-primary-container">
                  <Icon name={f.icon} size={22} />
                </span>
                <h3 className="font-display text-lg font-bold text-on-surface">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">{f.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Cara kerja */}
      <section id="cara" className="border-y border-outline-variant bg-surface-container/40">
        <div className="mx-auto max-w-6xl px-4 py-20 lg:px-8">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <Badge variant="secondary" className="mb-3">
              Cara Kerja
            </Badge>
            <h2 className="font-display text-3xl font-extrabold text-on-surface">
              Empat langkah menuju paham
            </h2>
          </div>
          <ol className="grid gap-5 md:grid-cols-4">
            {[
              ["1", "Masukkan ekspresi", "Ketik fungsi seperti f(x) = 3x² + 2x − 1."],
              [
                "2",
                "AI menganalisis",
                "Mesin menghitung turunan, akar, ekstrem, dan integral numerik.",
              ],
              ["3", "Pahami langkahnya", "Setiap aturan turunan dijelaskan satu per satu."],
              ["4", "Latihan adaptif", "Soal naik/turun kesulitan mengikuti penguasaanmu."],
            ].map(([n, t, d]) => (
              <li
                key={n}
                className="relative rounded-2xl border border-outline-variant bg-surface p-6 shadow-soft"
              >
                <span className="mb-4 grid h-9 w-9 place-items-center rounded-full bg-brand-gradient font-display text-sm font-bold text-on-primary">
                  {n}
                </span>
                <h3 className="font-display font-bold text-on-surface">{t}</h3>
                <p className="mt-1.5 text-sm text-on-surface-variant">{d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Modul */}
      <section id="modul" className="mx-auto max-w-6xl px-4 py-20 lg:px-8">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <Badge variant="tertiary" className="mb-3">
            Kurikulum
          </Badge>
          <h2 className="font-display text-3xl font-extrabold text-on-surface">
            Delapan topik Kalkulus Peubah Banyak
          </h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            "Fungsi Multivariabel",
            "Fungsi Vektor & Kurva",
            "Limit & Kontinuitas",
            "Turunan Parsial & Gradien",
            "Diferensial & Rantai",
            "Ekstrem & Optimasi",
            "Integral Lipat Dua",
            "Integral Lipat Tiga",
          ].map((t, i) => (
            <div
              key={t}
              className="flex items-center gap-3 rounded-2xl border border-outline-variant bg-surface-container/50 p-4"
            >
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary-container text-xs font-bold text-on-primary-container">
                {i + 1}
              </span>
              <span className="text-sm font-semibold text-on-surface">{t}</span>
            </div>
          ))}
        </div>
        <div className="mt-12 text-center">
          <Link href={user ? ctaHref : "/register"}>
            <Button size="lg">
              {user ? "Lanjut Belajar" : "Daftar Sekarang"}
              <Icon name="arrow-right" size={18} />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-outline-variant">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-8 text-sm text-on-surface-variant sm:flex-row lg:px-8">
          <span>
            © {new Date().getFullYear()} VisualMath AI · Proyek Praktikum Frontend Engineer
          </span>
          <span className="flex items-center gap-1.5">
            <Icon name="sparkle" size={14} className="text-primary" />
            Dibangun dengan Next.js
          </span>
        </div>
      </footer>
    </div>
  );
}
