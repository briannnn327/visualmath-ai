/* =========================================================
   Store data in-memory (mock backend untuk praktikum FE)
   CATATAN: data ini di-reset saat server restart. Untuk
   produksi: ganti dengan database asli (lihat SKPL).
   ========================================================= */
import type {
  ActivityLog,
  AIConfig,
  FormulaRecord,
  HistoryRecord,
  Kelas,
  MaterialItem,
  Progress,
  Question,
  Topic,
  User,
} from "@/lib/types";
import { uid } from "@/lib/utils";

let seeded = false;

export const db = {
  users: [] as User[],
  kelas: [] as Kelas[],
  topics: [] as Topic[],
  questions: [] as Question[],
  progress: [] as Progress[],
  history: [] as HistoryRecord[],
  materials: [] as MaterialItem[],
  formulas: [] as FormulaRecord[],
  logs: [] as ActivityLog[],
  aiConfig: null as AIConfig | null,
};

export function ensureSeeded(): void {
  if (seeded) return;
  seeded = true;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { seed } = require("@/lib/db/seed");
  seed();
}

/* ---------- helper query ---------- */

export function findUserByEmail(email: string): User | undefined {
  return db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
}

export function getUserById(id: string): User | undefined {
  return db.users.find((u) => u.id === id);
}

export function getTopicById(id: string): Topic | undefined {
  return db.topics.find((t) => t.id === id);
}

export function getKelasById(id: string): Kelas | undefined {
  return db.kelas.find((k) => k.id === id);
}

export function progressOf(userId: string, topicId: string): Progress | undefined {
  return db.progress.find((p) => p.userId === userId && p.topicId === topicId);
}

export function upsertProgress(entry: Progress): void {
  const idx = db.progress.findIndex(
    (p) => p.userId === entry.userId && p.topicId === entry.topicId
  );
  if (idx >= 0) db.progress[idx] = entry;
  else db.progress.push(entry);
}

export function minMasteryAll(): number {
  if (db.progress.length === 0) return 0;
  return Math.min(...db.progress.map((p) => p.mastery));
}

export function recordActivity(partial: Omit<ActivityLog, "id" | "createdAt">): ActivityLog {
  const log: ActivityLog = {
    id: uid("l-") as ActivityLog["id"],
    actorName: partial.actorName,
    action: partial.action,
    target: partial.target,
    severity: partial.severity,
    userId: partial.userId,
    createdAt: new Date().toISOString(),
  };
  db.logs.push(log);
  if (db.logs.length > 400) db.logs.shift();
  return log;
}

export function addHistory(partial: Omit<HistoryRecord, "id" | "createdAt">): HistoryRecord {
  const rec: HistoryRecord = {
    id: uid("h-") as HistoryRecord["id"],
    userId: partial.userId,
    kind: partial.kind,
    title: partial.title,
    summary: partial.summary,
    score: partial.score,
    xp: partial.xp,
    createdAt: new Date().toISOString(),
  };
  db.history.push(rec);
  return rec;
}

export function startOfToday(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function isToday(iso: string): boolean {
  return new Date(iso).getTime() >= startOfToday();
}