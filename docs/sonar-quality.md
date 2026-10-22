# Kualitas Kode — SonarQube Cloud

Ringkasan konfigurasi analisis statis repo ini, plus daftar aturan yang **ditunda (defer)**
berserta alasannya.

## Konfigurasi

| Item | Nilai |
| --- | --- |
| Project key | `briannnn327_visualmath-ai` |
| Organization | `briannnn327` |
| Scope analisis | `sonar.sources=src` (file test & `src/generated/prisma` dikecualikan) |
| Coverage | `coverage/lcov.info`, dikirim job `sonar-scan` (`npm run test:coverage`) |
| Automatic Analysis | **mati** — SonarCloud menolak CI analysis selama autoscan aktif |

Dashboard: <https://sonarcloud.io/dashboard?id=briannnn327_visualmath-ai&branch=main>

Konfigurasi scanner ada di [`sonar-project.properties`](../sonar-project.properties),
job CI ada di [`.github/workflows/ci.yml`](../.github/workflows/ci.yml).

## Aturan yang ditunda (won't fix)

Issue berikut ditandai **won't fix** di SonarQube: bukan bug, dan "perbaikannya" justru
menurunkan aksesibilitas atau maintainability.

### `typescript:S6845` — `tabIndex` hanya boleh pada elemen interaktif

- **Lokasi**: `src/components/math-plot.tsx`, `src/components/multivariable-plot.tsx`
- **Alasan**: plot fungsi dan peta kontur adalah *custom widget* interaktif — keduanya punya
  handler `onKeyDown` (panah kiri/kanan, dan atas/bawah untuk peta kontur) untuk menjelajahi
  titik data. Elemen `<div>` non-native **tidak bisa difokuskan tanpa `tabIndex`**, dan
  pola `role="application"` + `tabIndex="0"` adalah pendekatan yang direkomendasikan WAI-ARIA
  untuk widget seperti ini. Melekati `tabIndex` justru membuat grafik tidak bisa dioperasikan
  dengan keyboard.
- **Catatan**: aturan Biome yang setara (`lint/a11y/noNoninteractiveTabindex`) sudah
  di-*ignore* di kedua lokasi dengan alasan yang sama.

### `githubactions:S6505` / `S8543` / `S7637` — pin `npx` & pin action ke commit SHA

- **Lokasi**: `.github/workflows/ci.yml`
- **Alasan**:
  - `npx prisma generate` memakai binary **lokal** dari `devDependencies` (`prisma@^7.10.0`),
    bukan mengunduh versi acak dari registry — jadi tidak ada risiko supply chain dari `npx`.
  - Action GitHub dipin ke *version tag* (mis. `actions/checkout@v7`) alih-alih commit SHA,
    supaya versinya mudah diaudit dan di-*upgrade* seragam. Repo ini tidak memakai action dari
    fork pihak ketiga.
- **Catatan**: file workflow berada di luar scope analisis (`sonar.sources=src`), sehingga aturan
  ini tidak lagi muncul di daftar issue.

## Ringkasan perbaikan

| Rule | Perbaikan |
| --- | --- |
| `typescript:S9383` | `await recordActivity(...)` — promise yang mengambang di route `exercises/complete` |
| `typescript:S6638` | Guard `role === "mahasiswa" \|\| nim \|\| true` dibuang; field NIM hanya untuk mahasiswa |
| `typescript:S3923` | Cabang `fmtTick` kini benar-benar berbeda (bulat vs pecahan 2 desimal) |
| `typescript:S2871` | `.sort()` tanpa comparator → `localeCompare` (konsisten dengan file lain) |
| `typescript:S7773` | 12× `NaN` → `Number.NaN` di `src/lib/math/parser.ts` |
| `typescript:S2245` | `Math.random()` → Web Crypto (`crypto.getRandomValues`) untuk ID, token, kode sertifikat, dan pemilihan soal |
| `typescript:S7767` | `\| 0` → `Math.trunc` |
| `typescript:S6850` | `CardTitle` merender `children` secara eksplisit |
| `typescript:S1313` | IP LAN hard-coded di `next.config.ts` dipindah ke env `DEV_ORIGIN` |
| `css:S8776` | `@utility no-scrollbar` diganti selector berkelas agar punya scoping root |
