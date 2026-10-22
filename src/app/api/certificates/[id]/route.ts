import type { NextRequest } from "next/server";
import { getCertificateById } from "@/lib/db/store";
import { apiUser, forbidden, notFound, unauthorized } from "@/lib/server/api-auth";
import { buildCertificatePdf } from "@/lib/server/certificate";

/** Unduh sertifikat sebagai PDF. Pemilik & admin boleh mengunduh. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await apiUser(request);
  if (!user) return unauthorized();

  const { id } = await params;
  const cert = await getCertificateById(id);
  if (!cert) return notFound("Sertifikat tidak ditemukan");
  if (cert.userId !== user.id && user.role !== "admin") return forbidden();

  const pdf = buildCertificatePdf({
    recipientName: cert.recipientName,
    identity: cert.identity,
    topicTitle: cert.topicTitle,
    score: cert.score,
    xp: cert.xp,
    code: cert.code,
    issuedAt: cert.issuedAt,
  });

  const filename = `sertifikat-${cert.code}.pdf`;
  return new Response(pdf as unknown as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "private, max-age=0, no-store",
    },
  });
}
