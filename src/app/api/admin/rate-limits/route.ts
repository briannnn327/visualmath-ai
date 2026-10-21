import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { apiUser, forbidden, unauthorized } from "@/lib/server/api-auth";
import { aiRateLimitRules, rateLimitSnapshot } from "@/lib/server/rate-limit";

export async function GET(request: NextRequest) {
  const user = await apiUser(request);
  if (!user) return unauthorized();
  if (user.role !== "admin") return forbidden();

  const [rows, rules] = await Promise.all([
    rateLimitSnapshot(),
    Promise.resolve(aiRateLimitRules()),
  ]);
  return NextResponse.json({
    rules: Object.entries(rules).map(([bucket, rule]) => ({
      bucket,
      limit: rule.limit,
      windowMinutes: Math.round(rule.windowMs / 60000),
    })),
    usage: rows,
  });
}
