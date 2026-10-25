import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { isCertificateEligible } from "@/lib/certificate";
import {
  addHistory,
  createCertificateOnce,
  findCertificateForTopic,
  getCertificateByCode,
  getCertificateById,
  getTopicById,
  recordActivity,
  sessionSummary,
} from "@/lib/db/store";
import { apiUser, badRequest, unauthorized } from "@/lib/server/api-auth";
import { certificateResultId } from "@/lib/server/certificate-id";
import { notifyUser } from "@/lib/server/notify";
import { randomString } from "@/lib/utils";

const schema = z.object({
  topicId: z.string().min(1),
  sessionId: z.string().min(8).max(100),
  finishReason: z.enum(["selesai", "quit"]).optional(),
});

/** Kode sertifikat publik yang mudah dibaca & diverifikasi. */
function certificateCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const body = randomString(8, alphabet);
  return `VM-${body.slice(0, 4)}-${body.slice(4)}`;
}

type NewCertificate = Parameters<typeof createCertificateOnce>[0];

/** Ulangi hanya jika kode publik kebetulan bentrok (sangat jarang). */
async function createCertificateWithUniqueCode(data: Omit<NewCertificate, "code">): Promise<{
  certificate: Awaited<ReturnType<typeof createCertificateOnce>>["certificate"];
  created: boolean;
}> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    let code = certificateCode();
    while (await getCertificateByCode(code)) code = certificateCode();
    try {
      return await createCertificateOnce({ ...data, code });
    } catch (error) {
      const conflict = (error as { code?: string } | null)?.code === "P2002";
      if (!conflict || attempt === 2) throw error;
    }
  }
  throw new Error("Gagal membuat kode sertifikat unik.");
}

export async function POST(request: NextRequest) {
  const user = await apiUser(request);
  if (!user) return unauthorized();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("Request body tidak valid");
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message ?? "Data sesi tidak valid");
  }

  const topic = await getTopicById(parsed.data.topicId);
  /* Rekap dari catatan server — body klien tidak dipakai untuk skor/XP. */
  const { total, correct, xp } = await sessionSummary(
    user.id,
    parsed.data.sessionId,
    parsed.data.topicId,
  );
  const score = total > 0 ? Math.round((correct / total) * 100) : 0;
  const topicTitle = topic?.title ?? "Latihan";

  if (total === 0) {
    return NextResponse.json({
      history: null,
      score,
      total,
      correct,
      xp,
      certificateId: null,
    });
  }

  const rec = await addHistory({
    userId: user.id,
    kind: "quiz",
    title: `Kuis adaptif: ${topicTitle}`,
    summary: `Skor ${score} · ${correct} dari ${total} benar · +${xp} XP${parsed.data.finishReason === "quit" ? " (dihentikan)" : ""}.`,
    score,
    xp,
  });

  await recordActivity({
    userId: user.id,
    actorName: user.name,
    action: "quiz.submit",
    target: topicTitle,
    severity: "info",
  });

  /* Terbitkan sertifikat otomatis bila lulus ambang & sesi tuntas. */
  let certificateId: string | null = null;
  const passed = isCertificateEligible(score, parsed.data.finishReason);
  if (passed && topic) {
    const resultId = certificateResultId(user.id, topic.id, parsed.data.sessionId);
    const sameResult = await getCertificateById(resultId);

    if (sameResult) {
      certificateId = sameResult.id;
    } else {
      const existing = await findCertificateForTopic(user.id, topic.id);
      if (existing && existing.score >= score) {
        certificateId = existing.id;
      } else {
        const { certificate: cert, created } = await createCertificateWithUniqueCode({
          id: resultId,
          userId: user.id,
          topicId: topic.id,
          topicTitle,
          score,
          xp,
          recipientName: user.name,
          identity: user.nim || user.email,
        });
        certificateId = cert.id;

        if (created) {
          await recordActivity({
            userId: user.id,
            actorName: user.name,
            action: "certificate.issue",
            target: cert.code,
            severity: "info",
          });

          await notifyUser({
            userId: user.id,
            kind: "success",
            title: "Sertifikat pencapaian terbit!",
            body: `Kamu lulus topik ${topicTitle} dengan skor ${score}/100.`,
            href: `/sertifikat/${cert.id}`,
            email: true,
          });
        }
      }
    }
  }

  return NextResponse.json({ history: rec, score, total, correct, xp, certificateId });
}
