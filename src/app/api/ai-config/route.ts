import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getAIConfig, recordActivity, updateAIConfig } from "@/lib/db/store";
import { type AIConfigInput, aiConfigSchema, parseBody } from "@/lib/schemas";
import { apiUser, badRequest, forbidden, unauthorized } from "@/lib/server/api-auth";

export async function GET(request: NextRequest) {
  const user = await apiUser(request);
  if (!user) return unauthorized();
  const config = await getAIConfig();
  return NextResponse.json({ config });
}

export async function PATCH(request: NextRequest) {
  const user = await apiUser(request);
  if (!user) return unauthorized();
  if (user.role !== "admin") return forbidden();

  const current = await getAIConfig();
  if (!current) return badRequest("Konfigurasi AI belum ada");

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

  const config = await updateAIConfig({
    model: input.model,
    temperature: input.temperature,
    maxTokens: input.maxTokens,
    features: input.features,
    systemPrompt: input.systemPrompt,
  });
  await recordActivity({
    userId: user.id,
    actorName: user.name,
    action: "ai.configure",
    target: config.model,
    severity: "info",
  });
  return NextResponse.json({ config });
}
