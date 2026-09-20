/* =========================================================
   Lapisan data SERVER (dipakai oleh Server Components / RSC).
   Jangan import modul ini dari Client Components.
   ========================================================= */
import { cookies } from "next/headers";
import { getSession } from "@/lib/db/session";
import {
  db,
  ensureSeeded,
  getKelasById,
  getTopicById,
  getUserById,
  progressOf,
  startOfToday,
} from "@/lib/db/store";
import { toPublicUser } from "@/lib/server/api-auth";
import type {
  ActivityLog,
  ActivityTrendPoint,
  AdminDashboardData,
  AdminMetrics,
  ClassWithStats,
  HistoryRecord,
  Kelas,
  Progress,
  PublicUser,
  SessionInfo,
  StudentDashboardData,
  Topic,
  User,
  UserId,
} from "@/lib/types";

export async function getCurrentSession(): Promise<SessionInfo | null> {
  const c = await cookies();
  return getSession(c.get("vma_session")?.value) ?? null;
}

export async function getCurrentUser(): Promise<User | null> {
  ensureSeeded();
  const session = await getCurrentSession();
  if (!session) return null;
  return getUserById(session.userId) ?? null;
}

export async function getCurrentPublicUser(): Promise<PublicUser | null> {
  ensureSeeded();
  const session = await getCurrentSession();
  if (!session) return null;
  const user = getUserById(session.userId);
  return user ? toPublicUser(user) : null;
}

/* ---------------- Mahasiswa ---------------- */

export interface StudentDashboardLite {
  topics: Array<{ topic: Topic; progress: Progress }>;
  stats: StudentDashboardData["stats"];
  recent: HistoryRecord[];
  recommendation: StudentDashboardData["recommendation"];
  kelasName?: string;
  classRank?: number;
}

export async function getStudentData(userId: string): Promise<StudentDashboardLite> {
  const topics = [...db.topics].sort((a, b) => a.order - b.order);
  const rows: Array<{ topic: Topic; progress: Progress }> = topics.map((topic) => {
    const existing = progressOf(userId, topic.id);
    const progress: Progress = existing ?? {
      userId: userId as UserId,
      topicId: topic.id,
      mastery: 0,
      attempts: 0,
      solved: 0,
      xp: 0,
      updatedAt: new Date(0).toISOString(),
    };
    return { topic, progress };
  });

  const mine = rows.filter((r) => r.progress.attempts > 0);
  const totalXp = db.progress.filter((p) => p.userId === userId).reduce((s, p) => s + p.xp, 0);
  const core = mine.filter((r) => r.progress.mastery >= 70).length;
  const solvedTotal = db.progress
    .filter((p) => p.userId === userId)
    .reduce((s, p) => s + p.solved, 0);
  const avgMastery =
    mine.length > 0
      ? Math.round((mine.reduce((s, r) => s + r.progress.mastery, 0) / mine.length) * 10) / 10
      : 0;

  /* Streak: hari-hari berurutan dengan aktivitas, dihitung dari hari ini mundur */
  const activityDays = new Set(
    db.history.filter((h) => h.userId === userId).map((h) => new Date(h.createdAt).toDateString()),
  );
  let streak = 0;
  const cursor = new Date();
  while (activityDays.has(cursor.toDateString())) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }

  /* Rekomendasi: prioritas 1 = topik mulai dikerjakan dgn mastery < 50 (terendah dulu),
     prioritas 2 = topik belum dicoba (order terkecil). */
  const attempted = mine
    .filter((r) => r.progress.mastery < 50)
    .sort((a, b) => a.progress.mastery - b.progress.mastery);
  const notStarted = rows
    .filter((r) => r.progress.attempts === 0)
    .sort((a, b) => a.topic.order - b.topic.order);
  let recommendation: StudentDashboardData["recommendation"] = null;
  const recTarget = attempted[0] ?? notStarted[0];
  if (recTarget) {
    recommendation = {
      topicId: recTarget.topic.id,
      title: recTarget.topic.title,
      reason: attempted[0]
        ? `Mastery kamu masih ${recTarget.progress.mastery}% — kencangkan latihan di topik ini.`
        : "Topik belum dimulai — ini fondasi untuk materi selanjutnya.",
      priority: 1,
    };
  }

  /* Peringkat kelas dari rata-rata mastery */
  let kelasName: string | undefined;
  let classRank: number | undefined;
  const user = getUserById(userId);
  if (user?.kelasId) {
    const kelas = getKelasById(user.kelasId);
    kelasName = kelas?.nama;
    const classmates = kelas?.mahasiswaIds ?? [];
    const avgs = classmates
      .map((cid) => {
        const rows2 = db.progress.filter((p) => p.userId === cid && p.attempts > 0);
        if (rows2.length === 0) return { id: cid, avg: 0 };
        return {
          id: cid,
          avg: rows2.reduce((s, p) => s + p.mastery, 0) / rows2.length,
        };
      })
      .sort((a, b) => b.avg - a.avg);
    const myAvg = avgs.find((a) => a.id === userId);
    if (myAvg) classRank = 1 + avgs.findIndex((a) => a.id === userId);
  }

  const recent = db.history
    .filter((h) => h.userId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 5);

  return {
    topics: rows,
    stats: {
      totalXp,
      core,
      streak,
      solvedTotal,
      avgMastery,
    },
    recent,
    recommendation,
    kelasName,
    classRank,
  };
}

export async function getStudentHistory(userId: string): Promise<HistoryRecord[]> {
  return db.history
    .filter((h) => h.userId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/* ---------------- Dosen ---------------- */

export async function getDosenStats(userId: string) {
  const myClasses = db.kelas.filter((k) => k.dosenId === userId);
  const studentIds = new Set(myClasses.flatMap((k) => k.mahasiswaIds));
  const students = [...studentIds];
  const materials = db.materials.filter((m) => m.createdBy === userId);
  const progressRows = db.progress.filter((p) => studentIds.has(p.userId));
  const avgMastery =
    progressRows.length > 0
      ? Math.round((progressRows.reduce((s, p) => s + p.mastery, 0) / progressRows.length) * 10) /
        10
      : 0;

  const kelas: ClassWithStats[] = myClasses.map((k) => {
    const rows = db.progress.filter((p) => k.mahasiswaIds.includes(p.userId));
    const avg = rows.length ? rows.reduce((s, p) => s + p.mastery, 0) / rows.length : 0;
    return {
      ...k,
      studentCount: k.mahasiswaIds.length,
      avgMastery: Math.round(avg * 10) / 10,
      activeCount: rows.filter((p) => new Date(p.updatedAt).getTime() >= startOfToday()).length,
    };
  });

  const recent = db.history
    .filter((h) => studentIds.has(h.userId))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 6);

  return {
    stats: {
      classes: myClasses.length,
      students: students.length,
      materials: materials.length,
      avgMastery,
    },
    classes: kelas,
    recent,
  };
}

export interface RosterRow {
  user: User;
  rows: Array<{ topic: Topic; mastery: number }>;
  avg: number;
  xp: number;
  lastActive: string;
}

export function getKelasRoster(kelas: Kelas): RosterRow[] {
  return kelas.mahasiswaIds
    .map((uid2) => {
      const user = getUserById(uid2);
      if (!user) return null;
      const pRows = db.progress.filter((p) => p.userId === uid2);
      const mapped = pRows.map((p) => {
        const topic = getTopicById(p.topicId);
        // biome-ignore lint/style/noNonNullAssertion: topic selalu ada pada seed data.
        return { topic: topic!, mastery: p.mastery };
      });
      const avg = mapped.length ? mapped.reduce((s, m) => s + m.mastery, 0) / mapped.length : 0;
      const xp = pRows.reduce((s, p) => s + p.xp, 0);
      const lastActive = pRows.length
        ? pRows
            .map((p) => p.updatedAt)
            .sort()
            .reverse()[0]
        : user.createdAt;
      return { user, rows: mapped, avg: Math.round(avg * 10) / 10, xp, lastActive };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);
}

/* ---------------- Admin ---------------- */

export async function getAdminData(): Promise<AdminDashboardData> {
  const todayMs = startOfToday();

  const userCounts = {
    mahasiswa: db.users.filter((u) => u.role === "mahasiswa").length,
    dosen: db.users.filter((u) => u.role === "dosen").length,
    admin: db.users.filter((u) => u.role === "admin").length,
  };

  const todayLogs = db.logs.filter((l) => new Date(l.createdAt).getTime() >= todayMs);
  const distinctUsers = new Set(todayLogs.map((l) => l.userId?.toString() ?? "sistem"));
  const aiToday = db.logs.filter(
    (l) => new Date(l.createdAt).getTime() >= todayMs && /ai\.|quiz\.|graph\./.test(l.action),
  ).length;
  const todayHistory = db.history.filter(
    (h) => h.userId === "u-m0" && new Date(h.createdAt).getTime() >= todayMs,
  );
  const avgXpToday =
    todayHistory.length > 0
      ? Math.round((todayHistory.reduce((s, h) => s + (h.xp ?? 0), 0) / todayHistory.length) * 10) /
        10
      : 0;

  const metrics: AdminMetrics = {
    userCounts,
    topicCount: db.topics.length,
    questionCount: db.questions.length,
    classCount: db.kelas.length,
    formulaCountToday: db.logs.filter(
      (l) => l.action === "ai.explain" && new Date(l.createdAt).getTime() >= todayMs,
    ).length,
    activeUsersToday: distinctUsers.size,
    aiRequestsToday: aiToday,
    avgXpToday,
  };

  const trend: ActivityTrendPoint[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const start = new Date(d);
    start.setHours(0, 0, 0, 0);
    const end = start.getTime() + 24 * 60 * 60 * 1000;
    const dayLogs = db.logs.filter((l) => {
      const t = new Date(l.createdAt).getTime();
      return t >= start.getTime() && t < end;
    });
    const dayQuizzes = db.history.filter((h) => {
      const t = new Date(h.createdAt).getTime();
      return h.kind === "quiz" && t >= start.getTime() && t < end;
    });
    const correctRate = dayQuizzes.length
      ? (dayQuizzes.filter((h) => (h.score ?? 0) >= 60).length / dayQuizzes.length) * 100
      : 0;
    trend.push({
      label: new Intl.DateTimeFormat("id-ID", { weekday: "short" }).format(d),
      requests: dayLogs.length,
      correct: Math.round(correctRate),
    });
  }

  const logs: ActivityLog[] = [...db.logs]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 12);

  return { metrics, trend, logs };
}

/* ---------------- Umum ---------------- */

export function allUsers(): User[] {
  return [...db.users].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function getAllKelas(): Kelas[] {
  return [...db.kelas].sort((a, b) => a.nama.localeCompare(b.nama));
}
