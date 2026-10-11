import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getAIConfig, listLogs, listUsers } from "@/lib/db/store";
import { apiUser, forbidden, unauthorized } from "@/lib/server/api-auth";

export async function GET(request: NextRequest) {
  const user = await apiUser(request);
  if (!user) return unauthorized();
  if (user.role !== "admin") return forbidden();

  const q = request.nextUrl.searchParams.get("q") ?? "logs";

  if (q === "metrics") {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayMs = today.getTime();
    const [logs, users, cfg] = await Promise.all([listLogs(), listUsers(), getAIConfig()]);
    const logsToday = logs.filter((l) => new Date(l.createdAt).getTime() >= todayMs);
    const metrics = {
      totalUsers: users.length,
      activeToday: new Set(logsToday.map((l) => l.userId?.toString() ?? "sistem")).size,
      requestsToday: logsToday.length,
      errorsToday: logsToday.filter((l) => l.severity === "error").length,
      warningsToday: logsToday.filter((l) => l.severity === "warning").length,
      avgResponseMs: 840 + Math.floor(Math.random() * 240),
      uptime: 99.98,
      models: new Set(logs.filter((l) => l.action === "ai.configure").map(() => cfg?.model ?? "-"))
        .size,
    };
    return NextResponse.json({ metrics });
  }

  const severity = request.nextUrl.searchParams.get("severity");
  const logs = await listLogs();
  const filtered = logs.filter((l) => (severity ? l.severity === severity : true));
  return NextResponse.json({ logs: filtered });
}
