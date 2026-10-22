import { describe, expect, it } from "vitest";
import { buildCertificatePdf, buildPdf } from "@/lib/server/certificate";

function toText(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("latin1");
}

describe("buildPdf — generator PDF minimalis", () => {
  it("menghasilkan header, trailer, dan objek yang valid", () => {
    const pdf = toText(buildPdf([{ text: "Halo", x: 10, y: 20, size: 12 }]));
    expect(pdf.startsWith("%PDF-1.4")).toBe(true);
    expect(pdf).toContain("1 0 obj");
    expect(pdf).toContain("/Type /Catalog");
    expect(pdf).toContain("xref");
    expect(pdf.trimEnd().endsWith("%%EOF")).toBe(true);
  });

  it("meloloskan tanda kurung pada teks", () => {
    const pdf = toText(buildPdf([{ text: "Skor (100)", x: 10, y: 20, size: 12 }]));
    expect(pdf).toContain("Skor \\(100\\)");
  });

  it("menyertakan xref offset yang menunjuk tepat ke objek", () => {
    const pdf = toText(buildPdf([{ text: "A", x: 0, y: 0, size: 10 }]));
    expect(pdf).toMatch(/xref\n0 7\n0000000000 65535 f /);
  });
});

describe("buildCertificatePdf — tata letak sertifikat", () => {
  it("memuat nama, topik, skor, dan kode sertifikat", () => {
    const pdf = toText(
      buildCertificatePdf({
        recipientName: "Maria Ulfa",
        identity: "materi/13/2023",
        topicTitle: "Turunan",
        score: 90,
        xp: 150,
        code: "VM-ABCD-2345",
        issuedAt: new Date("2026-10-17T00:00:00Z"),
      }),
    );
    expect(pdf).toContain("Maria Ulfa");
    expect(pdf).toContain("Turunan");
    expect(pdf).toContain("VM-ABCD-2345");
    expect(pdf).toContain("materi/13/2023");
  });
});
