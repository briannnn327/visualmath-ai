import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ensureSeeded, db } from "@/lib/db/store";
import { apiUser, forbidden, unauthorized } from "@/lib/server/api-auth";

export async function GET(request: NextRequest) {
  ensureSeeded();
  const user = apiUser(request);
  if (!user) return unauthorized();
  if (user.role !== "admin") return forbidden();

  const q = request.nextUrl.searchParams.get("q") ?? "logs";

  if (q === "metrics") {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayMs = today.getTime();
    const logsToday = db.logs.filter((l) => new Date(l.createdAt).getTime() >= todayMs);
    const metrics = {
      totalUsers: db.users.length,
      activeToday: new Set(logsToday.map((l) => l.userId?.toString() ?? "sistem")).size,
      requestsToday: logsToday.length,
      errorsToday: logsToday.filter((l) => l.severity === "error").length,
      warningsToday: logsToday.filter((l) => l.severity === "warning").length,
      avgResponseMs: 840 + Math.floor(Math.random() * 240),
      uptime: 99.98,
      models: new Set(db.logs.filter((l) => l.action === "ai.configure").map(() => db.aiConfig?.model ?? "-")).size,
    };
    return NextResponse.json({ metrics });
  }

  const severity = request.nextUrl.searchParams.get("severity");
  const logs = [...db.logs]
    .filter((l) => (severity ? l.severity === severity : true))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return NextResponse.json({ logs });
}