# VisualMath AI

Platform pembelajaran kalkulus peubah banyak (multivariabel) berbasis AI untuk pendidikan tinggi.
Dibangun sebagai **Proyek Akhir Praktikum Pemrograman Front-End** — D3 Teknik Informatika, Sekolah Vokasi UNS.

> **Live deployment:** <https://visualmath-ai-phi.vercel.app>

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

1. Repo ini sudah tersedia di GitHub: **https://github.com/briannnn327/visualmath-ai**.
2. Di Vercel: buka [vercel.com/new](https://vercel.com) → Import `briannnn327/visualmath-ai` (auto-detect Next.js, set SESSION_SECRET), atau deploy dari CLI di folder ini:
```bash
cd visualmath-ai
vercel --prod
```
3. Env production (opsional): `SESSION_SECRET` — jika kosong, dipakai default dev secret (cukup untuk demo).
4. Verifikasi live: `https://visualmath-ai-phi.vercel.app`

## Kontribusi

Tim: Maria Teofani Evernita Sagala (V3925048), Yusuf Febriansyah (V3925058). CRUD/hotfix via branch + Pull Request; CI otomatis menjalankan quality gate sebelum merge.