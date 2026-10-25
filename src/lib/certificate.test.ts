import { describe, expect, it } from "vitest";
import {
  CERTIFICATE_MAX_SCORE,
  CERTIFICATE_MIN_SCORE,
  certificateFilename,
  certificateVerificationPath,
  certificateVerificationUrl,
  formatCertificateDate,
  isCertificateCode,
  isCertificateEligible,
} from "@/lib/certificate";

describe("aturan kelulusan sertifikat", () => {
  it("mewajibkan skor minimal dan sesi tidak dihentikan", () => {
    expect(CERTIFICATE_MIN_SCORE).toBe(70);
    expect(CERTIFICATE_MAX_SCORE).toBe(100);
    expect(isCertificateEligible(70)).toBe(true);
    expect(isCertificateEligible(69)).toBe(false);
    expect(isCertificateEligible(100, "selesai")).toBe(true);
    expect(isCertificateEligible(100, "quit")).toBe(false);
    expect(isCertificateEligible(Number.NaN)).toBe(false);
  });
});

describe("verifikasi sertifikat", () => {
  it("membentuk path dan URL verifikasi yang aman", () => {
    expect(certificateVerificationPath(" vm-mped-zecc ")).toBe("/verifikasi/VM-MPED-ZECC");
    expect(certificateVerificationUrl("https://visualmath.ai/", "VM-MPED-ZECC")).toBe(
      "https://visualmath.ai/verifikasi/VM-MPED-ZECC",
    );
  });

  it("memvalidasi format kode publik", () => {
    expect(isCertificateCode("VM-MPED-ZECC")).toBe(true);
    expect(isCertificateCode("vm-mped-zecc")).toBe(true);
    expect(isCertificateCode("VM-1234")).toBe(false);
    expect(isCertificateCode("../../etc/passwd")).toBe(false);
  });
});

describe("format tanggal dan nama file", () => {
  it("memakai tanggal Indonesia yang konsisten", () => {
    expect(formatCertificateDate(new Date("2026-10-21T10:20:24.839Z"))).toBe("21 Oktober 2026");
  });

  it("membuat nama file dari kode sertifikat", () => {
    expect(certificateFilename("vm-mped-zecc", "pdf")).toBe("sertifikat-VM-MPED-ZECC.pdf");
    expect(certificateFilename("vm-mped-zecc", "png")).toBe("sertifikat-VM-MPED-ZECC.png");
  });
});
