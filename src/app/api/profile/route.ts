import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  getKelasById,
  listHistory,
  listProgress,
  recordActivity,
  updateUser,
} from "@/lib/db/store";
import { type ProfileInput, parseBody, profileSchema } from "@/lib/schemas";
import { apiUser, badRequest, toPublicUser, unauthorized } from "@/lib/server/api-auth";
import { hashPassword } from "@/lib/server/password";

export async function GET(request: NextRequest) {
  const user = await apiUser(request);
  if (!user) return unauthorized();

  const [progress, history] = await Promise.all([listProgress(), listHistory()]);
  const kelas = user.kelasId ? await getKelasById(user.kelasId) : undefined;
  const stats = {
    totalXp: progress.filter((p) => p.userId === user.id).reduce((s, p) => s + p.xp, 0),
    topicsStarted: progress.filter((p) => p.userId === user.id && p.attempts > 0).length,
    solved: progress.filter((p) => p.userId === user.id).reduce((s, p) => s + p.solved, 0),
    quizzes: history.filter((h) => h.userId === user.id && h.kind === "quiz").length,
  };
  const kelasProgress = user.kelasId
    ? (await getKelasById(user.kelasId))?.mahasiswaIds
        .map((uid2) => {
          const rows = progress.filter((p) => p.userId === uid2 && p.attempts > 0);
          const avg = rows.length ? rows.reduce((s, p) => s + p.mastery, 0) / rows.length : 0;
          return { userId: uid2, avg: Math.round(avg * 10) / 10 };
        })
        .sort((a, b) => b.avg - a.avg)
    : [];

  return NextResponse.json({ user: toPublicUser(user), kelas, stats, kelasProgress });
}

export async function PATCH(request: NextRequest) {
  const user = await apiUser(request);
  if (!user) return unauthorized();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("Request body tidak valid");
  }
  let input: ProfileInput;
  try {
    input = parseBody<ProfileInput>(body, profileSchema);
  } catch (err) {
    return badRequest(err instanceof Error ? err.message : "Data tidak valid");
  }

  const updateData: any = { name: input.name, nim: input.nim, prodi: input.prodi };
  if (input.password) updateData.password = hashPassword(input.password);
  const updated = await updateUser(user.id, updateData);

  await recordActivity({
    userId: user.id,
    actorName: user.name,
    action: "profile.update",
    target: "Profil",
    severity: "info",
  });
  return NextResponse.json({ user: toPublicUser(updated) });
}
