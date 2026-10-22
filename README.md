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
- **Database:** PostgreSQL 17 + **pgvector** (index HNSW) via **Prisma 7** (`@prisma/adapter-pg`)
- **AI:** multi-provider — **Google Gemini** (`@google/genai`) untuk OCR foto soal + embedding 768-dim (RAG) dan teks, plus **Groq** (OpenAI-compatible) sebagai provider teks alternatif (explainer langkah, hint, pembahasan). Provider & model dipilih dari panel Admin (`/admin/konfigurasi`). Mesin matematika tetap deterministik (`src/lib/math/parser.ts`); bila AI tidak aktif/gagal, narasi memakai hasil parser (degradasi aman).
- **Testing:** Vitest + `@vitest/coverage-v8`
- **Toolchain:** Vite/Rolldown demo (Modul 8), Biome, ESLint (eslint-config-next)
- **Visualisasi:** SVG interaktif + Recharts

## Menjalankan

Prasyarat: Node 24+, Docker.

```bash
npm install

# 1) Database (PostgreSQL 17 + pgvector)
docker compose up -d
npx prisma migrate deploy --config prisma7.config.ts

# 2) Environment
cp .env.example .env.local   # isi DATABASE_URL, SESSION_SECRET, GOOGLE_GENERATIVE_AI_API_KEY (+ GROQ_API_KEY bila pakai Groq)

# 3) Seed data demo (lalu opsional: hitung embedding materi)
npx prisma db seed --config prisma7.config.ts
npm run embeddings:backfill -- --all   # butuh GOOGLE_GENERATIVE_AI_API_KEY

npm run dev                  # http://localhost:3000
```

Akun demo (seed): mahasiswa `maria@students.uns.ac.id/maria123`, dosen `dosen@visualmath.ai/dosen123`, admin `admin@visualmath.ai/admin123`.

### AI & RAG

- **Provider teks**: dipilih di panel Admin (`/admin/konfigurasi`) — **Gemini** atau **Groq**. OCR (`/scan`) & embedding RAG **tetap Gemini**. Bila kolom `provider` belum diisi, dipakai env `AI_TEXT_PROVIDER` (default `gemini`).
- **Rate limit** per pengguna untuk endpoint AI (`formula` 30/jam, `scan` 15/jam, `help` 40/jam, `embedding` 10/jam); respons `429` dengan header `Retry-After`.
- **OCR** (`/scan`): hasil dibaca AI, lalu ekspresi **dapat dikoreksi manual** dan divalidasi sebelum dikirim ke AI Explainer (wajib `*` untuk perkalian, mis. `3*x^2`).
- **RAG**: materi di-embed per dokumen **dan per-chunk paragraf** (`MaterialChunk`, helper `chunkText`). Pencarian memakai chunk bila tersedia, dengan fallback ke vektor dokumen.
- **Backfill embedding**: `npm run embeddings:backfill` (hanya yang kosong) atau `-- --all` (hitung ulang semua). Dosen/admin juga bisa memicu dari panel materi.

### Database (gotcha)

`docker-compose.yml` memakai volume **external** `visualmath_pgdata`. Bila container di-recreate dengan image/libc berbeda, collation `en_US.utf8` dapat tidak sinkron sehingga perbandingan teks / FK gagal walau data benar. Perbaikan cepat:

```bash
npm run db:reindex   # = docker exec visualmath-db psql -U visualmath -d visualmath -c "REINDEX DATABASE visualmath"
```

Untuk jangka panjang, volume baru dibuat dengan `--locale=C` (lihat `docker-compose.yml`) agar deterministik.

## Kualitas & CI

```bash
npm run lint          # ESLint (eslint-config-next)
npm run typecheck     # tsc --noEmit
npm run check         # Biome (./src)
npm test              # Vitest (unit, DB-free)
npm run test:coverage # Vitest + coverage lcov
npm run build         # Next.js build
```

Pipeline CI/CD: `.github/workflows/ci.yml` (lint → Biome → typecheck → Vitest + coverage → build; laporan SonarQube non-blocking).
Quality gate SonarQube: `sonar-project.properties`.

### Menjalankan scan SonarQube (opsional)

Job `sonar-scan` otomatis **dilewati** selama secret belum tersedia. Agar scan benar-benar jalan, set secret berikut di repo:

```bash
gh secret set SONAR_TOKEN -v "<token dari sonarcloud.io/account/security>"
gh secret set SONAR_HOST_URL -v "https://sonarcloud.io"   # opsional, sudah ada default
```

Project key & organisasi ditentukan di `sonar-project.properties` (`sonar.projectKey`, `sonar.organization`).
Kode hasil `prisma generate` (`src/generated/prisma`) sudah dikecualikan agar tidak mengotori metrik.

> **Automatic Analysis sudah dimatikan** di project SonarCloud — analisis dijalankan oleh job `sonar-scan` di CI.
> Alasannya: SonarCloud menolak CI analysis kalau Automatic Analysis masih aktif, dan hanya CI yang bisa mengirim
> laporan coverage (`coverage/lcov.info`) karena harus menjalankan test lebih dulu.

## Struktur singkat

```
src/app/          App Router: (app) mahasiswa, dosen/, admin/, api/ (route handlers)
src/components/   UI primitif (cva) + fitur (math-plot, scan-soal, layout)
src/lib/          store/ (Zustand), hooks/ (TanStack Query), services/ (REST), db/ (Prisma + store), ai/ (Gemini + Groq + RAG), math/ (parser)
src/proxy.ts      Middleware proteksi rute & peran
```

## Deployment (Edge Cloud)

1. Repo ini sudah tersedia di GitHub: **https://github.com/briannnn327/visualmath-ai**.
2. Di Vercel: buka [vercel.com/new](https://vercel.com) → Import `briannnn327/visualmath-ai` (auto-detect Next.js, set SESSION_SECRET), atau deploy dari CLI di folder ini:
```bash
cd visualmath-ai
vercel --prod
```
3. Env production: `DATABASE_URL` (Postgres + pgvector), `SESSION_SECRET`, `GOOGLE_GENERATIVE_AI_API_KEY` (OCR/embedding) dan opsional `GROQ_API_KEY` (provider teks). Bila secret kosong, dipakai default dev secret (cukup untuk demo).
4. Verifikasi live: `https://visualmath-ai-phi.vercel.app`

## Kontribusi

Tim: Maria Teofani Evernita Sagala (V3925048), Yusuf Febriansyah (V3925058). CRUD/hotfix via branch + Pull Request; CI otomatis menjalankan quality gate sebelum merge.