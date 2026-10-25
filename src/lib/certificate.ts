/* =========================================================
   Aturan & format sertifikat yang dipakai bersama oleh server,
   komponen preview, dan API export.

   Modul ini sengaja bebas dari akses database/Node API agar aman
   diimpor oleh Client Component (mis. halaman hasil latihan).
   ========================================================= */

/** Skor minimum resmi agar sertifikat diterbitkan. */
export const CERTIFICATE_MIN_SCORE = 70;

/** Skor selalu dinormalisasi ke skala 100 oleh backend. */
export const CERTIFICATE_MAX_SCORE = 100;

/** Zona waktu tampilan tanggal sertifikat agar konsisten di semua renderer. */
export const CERTIFICATE_TIME_ZONE = "Asia/Jakarta";

export type CertificateFinishReason = "selesai" | "quit";

/** Aturan kelulusan tunggal untuk penerbitan sertifikat. */
export function isCertificateEligible(
  score: number,
  finishReason?: CertificateFinishReason,
): boolean {
  return Number.isFinite(score) && score >= CERTIFICATE_MIN_SCORE && finishReason !== "quit";
}

/** Path publik yang aman dibuka dari QR code. */
export function certificateVerificationPath(code: string): string {
  return `/verifikasi/${encodeURIComponent(code.trim().toUpperCase())}`;
}

/** URL absolut untuk QR code verifikasi. */
export function certificateVerificationUrl(baseUrl: string, code: string): string {
  return `${baseUrl.replace(/\/$/, "")}${certificateVerificationPath(code)}`;
}

/** Validasi bentuk kode publik sebelum query ke database. */
export function isCertificateCode(value: string): boolean {
  return /^VM-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(value.trim().toUpperCase());
}

/** Format tanggal penerbitan yang stabil untuk preview, PNG, dan PDF. */
export function formatCertificateDate(date: Date | string): string {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: CERTIFICATE_TIME_ZONE,
  }).format(typeof date === "string" ? new Date(date) : date);
}

/** Nama file unduhan yang konsisten untuk kedua format. */
export function certificateFilename(code: string, format: "pdf" | "png"): string {
  return `sertifikat-${code.trim().toUpperCase()}.${format}`;
}
