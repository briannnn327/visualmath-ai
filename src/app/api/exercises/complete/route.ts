import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  addHistory,
  createCertificate,
  findCertificateForTopic,
  getTopicById,
  recordActivity,
} from "@/lib/db/store";
import { apiUser, badRequest, unauthorized } from "@/lib/server/api-auth";
import { notifyUser } from "@/lib/server/notify";
import { randomString, uid } from "@/lib/utils";

const schema = z.object({
  topicId: z.string().min(1),
  total: z.number().int().min(1).max(50),
  correct: z.number().int().min(0).max(50),
  xp: z.number().int().min(0).max(2000),
  finishReason: z.enum(["selesai", "quit"]).optional(),
});

/** Skor minimum untuk mendapatkan sertifikat otomatis. */
const CERTIFICATE_MIN_SCORE = 70;

/** Kode sertifikat publik yang mudah dibaca & diverifikasi. */
function certificateCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const body = randomString(8, alphabet);
  return `VM-${body.slice(0, 4)}-${body.slice(4)}`;
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
  const score = Math.round((parsed.data.correct / parsed.data.total) * 100);
  const topicTitle = topic?.title ?? "Latihan";

  const rec = addHistory({
    userId: user.id,
    kind: "quiz",
    title: `Kuis adaptif: ${topicTitle}`,
    summary: `Skor ${score} · ${parsed.data.correct} dari ${parsed.data.total} benar · +${parsed.data.xp} XP${parsed.data.finishReason === "quit" ? " (dihentikan)" : ""}.`,
    score,
    xp: parsed.data.xp,
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
  const passed = score >= CERTIFICATE_MIN_SCORE && parsed.data.finishReason !== "quit";
  if (passed && topic) {
    const existing = await findCertificateForTopic(user.id, topic.id);
    if (existing && existing.score >= score) {
      certificateId = existing.id;
    } else {
      const cert = await createCertificate({
        id: uid("cert-"),
        userId: user.id,
        topicId: topic.id,
        topicTitle,
        score,
        xp: parsed.data.xp,
        recipientName: user.name,
        identity: user.nim || user.email,
        code: certificateCode(),
      });
      certificateId = cert.id;

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

  return NextResponse.json({ history: rec, score, certificateId });
}
