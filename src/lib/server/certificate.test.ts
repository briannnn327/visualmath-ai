import sharp from "sharp";
import { describe, expect, it } from "vitest";
import {
  buildCertificatePdf,
  buildCertificatePng,
  buildCertificateSvg,
  type CertificateRenderInput,
} from "@/lib/server/certificate";
import { certificateResultId } from "@/lib/server/certificate-id";
import { createCertificateQrMatrix } from "@/lib/server/certificate-qr";

const input: CertificateRenderInput = {
  recipientName: "Maria Teofani Evernita Sagala",
  topicTitle: "Sistem Koordinat & Fungsi Multivariabel",
  score: 90,
  xp: 150,
  code: "VM-MPED-ZECC",
  issuedAt: new Date("2026-10-21T10:20:24.839Z"),
  verificationUrl: "http://localhost:3000/verifikasi/VM-MPED-ZECC",
};

function visibleSvgText(svg: string): string {
  return svg
    .replace(/<title[\s\S]*?<\/title>/gi, " ")
    .replace(/<desc[\s\S]*?<\/desc>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

describe("buildCertificateSvg", () => {
  it("memuat seluruh data dinamis dan judul resmi", async () => {
    const svg = await buildCertificateSvg(input);
    const visible = visibleSvgText(svg);
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg).toContain('viewBox="0 0 1600 900"');
    expect(visible).toContain("CERTIFICATE OF ACHIEVEMENT");
    expect(visible).toContain("Sertifikat Pencapaian Pembelajaran");
    expect(visible).toContain("Maria Teofani Evernita Sagala");
    expect(visible).toContain("Sistem Koordinat & Fungsi Multivariabel");
    expect(visible).toContain("21 Oktober 2026");
    expect(visible).toContain("VM-MPED-ZECC");
    expect(visible).toContain("VISUALMATH AI LEARNING SYSTEM");
    expect(visible).toContain("localhost:3000");
  });

  it("meng-escape teks pengguna dan tidak menyisipkan HTML mentah", async () => {
    const svg = await buildCertificateSvg({
      ...input,
      recipientName: "A & B <script>alert(1)</script>",
      topicTitle: "Topik <b>uji</b>",
    });
    expect(svg).toContain("A &amp; B &lt;script&gt;");
    expect(svg).not.toContain("<script>");
    expect(svg).not.toContain("<b>uji</b>");
  });

  it("membungkus nama dan topik panjang tanpa menghilangkan kata", async () => {
    const longName =
      "Muhammad Rizky Pratama Putra Wijaya Kusuma Negara Indonesia Sejahtera Selamanya";
    const longTopic =
      "Limit, Kontinuitas, Turunan Parsial, Gradien, Diferensial, dan Aturan Rantai pada Fungsi Multivariabel";
    const svg = await buildCertificateSvg({
      ...input,
      recipientName: longName,
      topicTitle: longTopic,
    });
    const visible = visibleSvgText(svg);
    expect(visible).toContain(longName);
    expect(visible).toContain(longTopic);
    expect(visible).not.toContain("…");
    expect((svg.match(/<tspan/g) ?? []).length).toBeGreaterThan(2);
  });

  it("menampilkan QR matriks dan nilai skor", async () => {
    const qr = createCertificateQrMatrix(input.verificationUrl);
    expect(qr.size).toBeGreaterThan(20);
    expect(qr.modules).toHaveLength(qr.size * qr.size);
    expect(qr.modules.some(Boolean)).toBe(true);

    const svg = await buildCertificateSvg(input);
    expect(svg).toContain(">90<");
    expect(svg).toContain("/ 100");
    expect(svg).toContain("SCAN UNTUK VERIFIKASI");
  });
});

describe("certificateResultId", () => {
  it("stabil untuk hasil yang sama dan berbeda untuk sesi berbeda", () => {
    const first = certificateResultId("u-m0", "t0", "ex-session-1");
    const second = certificateResultId("u-m0", "t0", "ex-session-1");
    const otherSession = certificateResultId("u-m0", "t0", "ex-session-2");
    const otherUser = certificateResultId("u-m2", "t0", "ex-session-1");

    expect(first).toBe(second);
    expect(first).toMatch(/^cert-[a-f0-9]{24}$/);
    expect(first).not.toBe(otherSession);
    expect(first).not.toBe(otherUser);
  });
});

describe("export sertifikat", () => {
  it("menghasilkan PNG 3200x1800", async () => {
    const png = await buildCertificatePng(input);
    const metadata = await sharp(png).metadata();
    expect(png.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
    expect(metadata.format).toBe("png");
    expect(metadata.width).toBe(3200);
    expect(metadata.height).toBe(1800);
  }, 30_000);

  it("menghasilkan PDF 16:9 dengan image XObject dan xref valid", async () => {
    const pdf = await buildCertificatePdf(input);
    const text = pdf.toString("latin1");

    expect(text.startsWith("%PDF-1.4")).toBe(true);
    expect(text).toContain("/MediaBox [0 0 960 540]");
    expect(text).toContain("/Subtype /Image");
    expect(text).toContain("/Filter /FlateDecode");
    expect(text.trimEnd().endsWith("%%EOF")).toBe(true);

    const startxref = Number(/startxref\n(\d+)/.exec(text)?.[1]);
    expect(Number.isFinite(startxref)).toBe(true);
    expect(text.slice(startxref, startxref + 4)).toBe("xref");

    for (let object = 1; object <= 5; object += 1) {
      const offset = Number(
        new RegExp(
          `0000000000 65535 f \\n(?:\\d{10} 00000 n \\n){${object - 1}}(\\d{10}) 00000 n`,
        ).exec(text)?.[1],
      );
      expect(offset).toBeGreaterThan(0);
      expect(pdf.subarray(offset, offset + `${object} 0 obj`.length).toString("latin1")).toBe(
        `${object} 0 obj`,
      );
    }
  }, 30_000);
});
