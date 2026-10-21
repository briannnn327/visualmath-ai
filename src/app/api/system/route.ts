import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getAIConfig, listLogs, listUsers } from "@/lib/db/store";
import { apiUser, forbidden, unauthorized } from "@/lib/server/api-auth";
import {
  avgLatencyMs,
  latencySampleCount,
  processUptimeSec,
  recordLatency,
} from "@/lib/server/metrics";

export async function GET(request: NextRequest) {
  const user = await apiUser(request);
  if (!user) return unauthorized();
  if (user.role !== "admin") return forbidden();

  const q = request.nextUrl.searchParams.get("q") ?? "logs";

  if (q === "metrics") {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayMs = today.getTime();
    const t0 = performance.now();
    const [logs, users, cfg] = await Promise.all([listLogs(), listUsers(), getAIConfig()]);
    recordLatency(performance.now() - t0);
    const logsToday = logs.filter((l) => new Date(l.createdAt).getTime() >= todayMs);
    const metrics = {
      totalUsers: users.length,
      activeToday: new Set(logsToday.map((l) => l.userId?.toString() ?? "sistem")).size,
      requestsToday: logsToday.length,
      errorsToday: logsToday.filter((l) => l.severity === "error").length,
      warningsToday: logsToday.filter((l) => l.severity === "warning").length,
      avgResponseMs: avgLatencyMs(),
      latencySamples: latencySampleCount(),
      uptimeSec: processUptimeSec(),
      activeModel: cfg?.model ?? "-",
      activeProvider: cfg?.provider ?? "-",
    };
    return NextResponse.json({ metrics });
  }

  const severity = request.nextUrl.searchParams.get("severity");
  const logs = await listLogs();
  const filtered = logs.filter((l) => (severity ? l.severity === severity : true));
  return NextResponse.json({ logs: filtered });
}
