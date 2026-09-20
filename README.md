# VisualMath AI

Platform pembelajaran kalkulus peubah banyak (multivariabel) berbasis AI untuk pendidikan tinggi.
Dibangun sebagai **Proyek Akhir Praktikum Pemrograman Front-End** — D3 Teknik Informatika, Sekolah Vokasi UNS.

> **Live deployment:** <https://visualmath-ai.vercel.app> _(tautan diisi setelah deploy di Vercel/Cloudflare — lihat Bab Deployment pada README bagian bawah)_

---

## Fitur (sesuai SRS)

| Modul | Fitur |
|---|---|
| Mahasiswa | Landing, registrasi/login, dashboard, **AI Math Explainer** (solusi langkah demi langkah), grafik interaktif (SVG), latihan adaptif, riwayat & progres, profil, **scan foto soal** |
| Dosen | Manajemen kelas (roster), materi, progres mahasiswa |
| Admin | Manajemen pengguna, monitoring sistem, konfigurasi AI |

## Teknologi

- **Meta-framework:** Next.js 16.3.5 (App Router, React Server Components, Turbopack, React Compiler aktif)
- **UI:** React 19.2.8, Tailwind CSS **v4** (zero-runtime, Oxide Engine), CVA + Tailwind Merge, komponen headless custom
- **State:** Zustand 5 (client UI state), TanStack Query v5 (server state)
- **Data/type:** TypeScript strict + **Zod 4** runtime validation, REST via route handlers (BFF)
- **Toolchain:** Vite/Rolldown demo (Modul 8), Biome, ESLint (eslint-config-next)
- **Visualisasi:** SVG interaktif + Recharts

## Menjalankan

```bash
npm install
cp .env.example .env.local   # lalu isi SESSION_SECRET
npm run dev                  # http://localhost:3000
```

Akun demo (seed): mahasiswa `maria@students.uns.ac.id/maria123`, dosen `dosen@visualmath.ai/dosen123`, admin `admin@visualmath.ai/admin123`.

## Kualitas & CI

```bash
npm run lint          # ESLint (eslint-config-next)
npx biome check ./src # Biome (Rust) — 0 error
npx tsc --noEmit      # TypeScript strict
npm run build         # Next build (Turbopack)
```

Pipeline CI/CD: `.github/workflows/ci.yml` (lint → Biome → typecheck → build → SonarQube Cloud scan).
Quality gate SonarQube: `sonar-project.properties`.

## Struktur singkat

```
src/app/          App Router: (app) mahasiswa, dosen/, admin/, api/ (route handlers)
src/components/   UI primitif (cva) + fitur (math-plot, scan-soal, layout)
src/lib/          store/ (Zustand), hooks/ (TanStack Query), services/ (REST), db/ (in-memory + session)
src/proxy.ts      Middleware proteksi rute & peran
```

## Deployment (Edge Cloud)

1. Push repo ini ke GitHub, lalu import di [Vercel](https://vercel.com) atau Cloudflare Workers.
2. Framework preset: **Next.js** (Vercel otomatis mendeteksi `next.config.ts`).
3. Set env `SESSION_SECRET` di dashboard Vercel → Environment Variables.
4. Isi link live di bagian atas README ini.

## Kontribusi

Tim: Brian (bdkn), Maria. CRUD/hotfix via branch + Pull Request; CI otomatis menjalankan quality gate sebelum merge.