/* =========================================================
   Generator PDF minimalis tanpa dependensi.

   Menghasilkan satu halaman A4 landscape dengan teks memakai font
   standar PDF (Helvetica/Helvetica-Bold) sehingga tidak perlu menyematkan
   font. Cukup untuk sertifikat pencapaian.
   ========================================================= */

export interface PdfTextLine {
  text: string;
  x: number;
  y: number;
  size: number;
  bold?: boolean;
  color?: [number, number, number];
  align?: "left" | "center";
}

const A4_LANDSCAPE = { width: 842, height: 595 };

function escapePdfText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

/** Tebakan lebar teks (Helvetica) untuk penengahan sederhana. */
function approxWidth(text: string, size: number, bold: boolean): number {
  const factor = bold ? 0.56 : 0.5;
  return text.length * size * factor;
}

function colorOp([r, g, b]: [number, number, number]): string {
  return `${(r / 255).toFixed(3)} ${(g / 255).toFixed(3)} ${(b / 255).toFixed(3)} rg`;
}

/**
 * Bangun berkas PDF dari daftar baris teks.
 * Mengembalikan Uint8Array siap dikirim sebagai respons.
 */
export function buildPdf(lines: PdfTextLine[]): Uint8Array {
  const { width, height } = A4_LANDSCAPE;

  const content = lines
    .map((line) => {
      const font = line.bold ? "/F2" : "/F1";
      const color = colorOp(line.color ?? [30, 30, 30]);
      let x = line.x;
      if (line.align === "center") {
        x = (width - approxWidth(line.text, line.size, !!line.bold)) / 2;
      }
      const y = height - line.y;
      return `BT ${color} ${font} ${line.size} Tf ${x.toFixed(1)} ${y.toFixed(1)} Td (${escapePdfText(
        line.text,
      )}) Tj ET`;
    })
    .join("\n");

  const objects: string[] = [];
  objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  objects[2] = "<< /Type /Pages /Kids [3 0 R] /Count 1 >>";
  objects[3] =
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width} ${height}] ` +
    "/Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> /Contents 4 0 R >>";
  objects[4] = `<< /Length ${content.length} >>\nstream\n${content}\nendstream`;
  objects[5] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>";
  objects[6] =
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>";

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  for (let i = 1; i <= 6; i++) {
    offsets[i] = pdf.length;
    pdf += `${i} 0 obj\n${objects[i]}\nendobj\n`;
  }

  const xrefStart = pdf.length;
  pdf += "xref\n0 7\n0000000000 65535 f \n";
  for (let i = 1; i <= 6; i++) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size 7 /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

  /* WinAnsiEncoding = latin-1; konversi charCode agar aman. */
  const bytes = new Uint8Array(pdf.length);
  for (let i = 0; i < pdf.length; i++) bytes[i] = pdf.charCodeAt(i) & 0xff;
  return bytes;
}

export interface CertificateData {
  recipientName: string;
  identity?: string | null;
  topicTitle: string;
  score: number;
  xp: number;
  code: string;
  issuedAt: Date;
  appName?: string;
}

function formatDateId(date: Date): string {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

/** Susun tata letak sertifikat pencapaian sebagai PDF. */
export function buildCertificatePdf(data: CertificateData): Uint8Array {
  const appName = data.appName ?? "VisualMath AI";
  const accent: [number, number, number] = [103, 80, 164];
  const muted: [number, number, number] = [90, 90, 100];

  return buildPdf([
    { text: appName, x: 0, y: 80, size: 16, bold: true, color: accent, align: "center" },
    {
      text: "SERTIFIKAT PENCAPAIAN",
      x: 0,
      y: 140,
      size: 34,
      bold: true,
      color: [25, 25, 30],
      align: "center",
    },
    {
      text: "Diberikan kepada",
      x: 0,
      y: 200,
      size: 14,
      color: muted,
      align: "center",
    },
    {
      text: data.recipientName,
      x: 0,
      y: 250,
      size: 30,
      bold: true,
      color: accent,
      align: "center",
    },
    ...(data.identity
      ? [
          {
            text: `Identitas: ${data.identity}`,
            x: 0,
            y: 285,
            size: 13,
            color: muted,
            align: "center" as const,
          },
        ]
      : []),
    {
      text: `atas keberhasilannya menuntaskan kuis adaptif topik`,
      x: 0,
      y: 335,
      size: 14,
      color: [40, 40, 45],
      align: "center",
    },
    {
      text: data.topicTitle,
      x: 0,
      y: 370,
      size: 22,
      bold: true,
      color: [25, 25, 30],
      align: "center",
    },
    {
      text: `Skor ${data.score}/100  ·  ${data.xp} XP`,
      x: 0,
      y: 410,
      size: 15,
      color: muted,
      align: "center",
    },
    {
      text: `Kode sertifikat: ${data.code}`,
      x: 0,
      y: 470,
      size: 12,
      color: muted,
      align: "center",
    },
    {
      text: `Diterbitkan ${formatDateId(data.issuedAt)}`,
      x: 0,
      y: 492,
      size: 12,
      color: muted,
      align: "center",
    },
  ]);
}
