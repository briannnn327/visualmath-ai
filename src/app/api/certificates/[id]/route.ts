import type { NextRequest } from "next/server";
import { certificateFilename, certificateVerificationUrl } from "@/lib/certificate";
import { getCertificateById } from "@/lib/db/store";
import { apiUser, badRequest, forbidden, notFound, unauthorized } from "@/lib/server/api-auth";
import {
  buildCertificatePdf,
  buildCertificatePng,
  type CertificateFormat,
} from "@/lib/server/certificate";
import { appBaseUrl } from "@/lib/server/email";

export const runtime = "nodejs";

function parseFormat(value: string | null): CertificateFormat | null {
  if (value === null || value === "" || value === "pdf") return "pdf";
  if (value === "png") return "png";
  return null;
}

/**
 * Unduh sertifikat sebagai PDF (default) atau PNG.
 * Pemilik & admin boleh mengunduh; pengguna lain mendapat 403.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await apiUser(request);
  if (!user) return unauthorized();

  const { id } = await params;
  const cert = await getCertificateById(id);
  if (!cert) return notFound("Sertifikat tidak ditemukan");
  if (cert.userId !== user.id && user.role !== "admin") return forbidden();

  const format = parseFormat(request.nextUrl.searchParams.get("format"));
  if (!format) return badRequest("Format harus pdf atau png");

  const renderInput = {
    recipientName: cert.recipientName,
    topicTitle: cert.topicTitle,
    score: cert.score,
    xp: cert.xp,
    code: cert.code,
    issuedAt: cert.issuedAt,
    verificationUrl: certificateVerificationUrl(appBaseUrl(), cert.code),
  };

  try {
    const bytes =
      format === "png"
        ? await buildCertificatePng(renderInput)
        : await buildCertificatePdf(renderInput);

    return new Response(new Uint8Array(bytes), {
      status: 200,
      headers: {
        "Content-Type": format === "png" ? "image/png" : "application/pdf",
        "Content-Disposition": `attachment; filename="${certificateFilename(cert.code, format)}"`,
        "Cache-Control": "private, max-age=0, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("[certificate] gagal merender", error);
    return Response.json({ error: "Sertifikat gagal dibuat. Silakan coba lagi." }, { status: 500 });
  }
}
