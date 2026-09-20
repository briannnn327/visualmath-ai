import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { aiConfigSchema, parseBody, type AIConfigInput } from "@/lib/schemas";
import { db, ensureSeeded, recordActivity } from "@/lib/db/store";
import { apiUser, badRequest, forbidden, unauthorized } from "@/lib/server/api-auth";

export async function GET(request: NextRequest) {
  ensureSeeded();
  const user = apiUser(request);
  if (!user) return unauthorized();
  return NextResponse.json({ config: db.aiConfig });
}

export async function PATCH(request: NextRequest) {
  ensureSeeded();
  const user = apiUser(request);
  if (!user) return unauthorized();
  if (user.role !== "admin") return forbidden();

  if (!db.aiConfig) return badRequest("Konfigurasi AI belum ada");

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("Request body tidak valid");
  }
  let input: AIConfigInput;
  try {
    input = parseBody<AIConfigInput>(body, aiConfigSchema);
  } catch (err) {
    return badRequest(err instanceof Error ? err.message : "Data tidak valid");
  }

  Object.assign(db.aiConfig, input, { updatedAt: new Date().toISOString() });
  recordActivity({ userId: user.id, actorName: user.name, action: "ai.configure", target: db.aiConfig.model, severity: "info" });
  return NextResponse.json({ config: db.aiConfig });
}