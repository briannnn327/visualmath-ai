import { createHash } from "node:crypto";

/**
 * ID internal stabil untuk satu hasil pengerjaan.
 * Kode publik tetap dibuat acak dan terpisah agar tidak dapat ditebak.
 */
export function certificateResultId(userId: string, topicId: string, sessionId: string): string {
  const digest = createHash("sha256").update(`${userId}:${topicId}:${sessionId}`).digest("hex");
  return `cert-${digest.slice(0, 24)}`;
}
