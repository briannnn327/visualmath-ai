/* =========================================================
   Lapisan data SERVER berbasis Prisma (PostgreSQL).
   Semua fungsi async. Hanya dipakai di sisi server.
   ========================================================= */

import {
  mapAIConfig,
  mapFormula,
  mapHistory,
  mapKelas,
  mapLog,
  mapMaterial,
  mapProgress,
  mapQuestion,
  mapTopic,
  mapUser,
} from "@/lib/db/mappers";
import { prisma } from "@/lib/db/prisma";
import type {
  ActivityLog,
  AIConfig,
  Difficulty,
  FormulaRecord,
  HistoryRecord,
  Kelas,
  MaterialItem,
  MaterialType,
  Progress,
  Question,
  Role,
  Topic,
  User,
} from "@/lib/types";
import { uid } from "@/lib/utils";

/* ---------- helper waktu ---------- */
export function startOfToday(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function isToday(iso: string): boolean {
  return new Date(iso).getTime() >= startOfToday();
}

/* ---------- Users ---------- */
export async function listUsers(): Promise<User[]> {
  const rows = await prisma.user.findMany({ orderBy: { createdAt: "asc" } });
  return rows.map(mapUser);
}

export async function findUserByEmail(email: string): Promise<User | null> {
  const row = await prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
  });
  return row ? mapUser(row) : null;
}

export async function getUserById(id: string): Promise<User | null> {
  const row = await prisma.user.findUnique({ where: { id } });
  return row ? mapUser(row) : null;
}

export async function createUser(data: {
  id: string;
  name: string;
  email: string;
  password: string;
  role: Role;
  nim?: string;
  prodi?: string;
  kelasId?: string;
  color: string;
}): Promise<User> {
  const row = await prisma.user.create({
    data: {
      id: data.id,
      name: data.name,
      email: data.email,
      password: data.password,
      role: data.role,
      nim: data.nim ?? null,
      prodi: data.prodi ?? null,
      kelasId: data.kelasId ?? null,
      color: data.color,
    },
  });
  return mapUser(row);
}

export async function updateUser(
  id: string,
  data: Partial<{
    name: string;
    email: string;
    password: string;
    role: Role;
    nim: string | null;
    prodi: string | null;
    kelasId: string | null;
    color: string;
  }>,
): Promise<User> {
  const row = await prisma.user.update({ where: { id }, data });
  return mapUser(row);
}

export async function deleteUser(id: string): Promise<void> {
  await prisma.user.delete({ where: { id } });
}

/* ---------- Topics ---------- */
export async function listTopics(): Promise<Topic[]> {
  const rows = await prisma.topic.findMany({ orderBy: { order: "asc" } });
  return rows.map(mapTopic);
}

export async function getTopicById(id: string): Promise<Topic | null> {
  const row = await prisma.topic.findUnique({ where: { id } });
  return row ? mapTopic(row) : null;
}

/* ---------- Questions ---------- */
export async function listQuestions(): Promise<Question[]> {
  const rows = await prisma.question.findMany();
  return rows.map(mapQuestion);
}

/* ---------- Kelas ---------- */
export async function listKelas(): Promise<Kelas[]> {
  const rows = await prisma.kelas.findMany({
    include: { mahasiswa: { select: { id: true } } },
  });
  return rows.map(mapKelas);
}

export async function getKelasById(id: string): Promise<Kelas | null> {
  const row = await prisma.kelas.findUnique({
    where: { id },
    include: { mahasiswa: { select: { id: true } } },
  });
  return row ? mapKelas(row) : null;
}

export async function createKelas(data: {
  id: string;
  kode: string;
  nama: string;
  dosenId: string;
}): Promise<Kelas> {
  const row = await prisma.kelas.create({
    data: { id: data.id, kode: data.kode, nama: data.nama, dosenId: data.dosenId },
    include: { mahasiswa: { select: { id: true } } },
  });
  return mapKelas(row);
}

export async function updateKelas(
  id: string,
  data: Partial<{ kode: string; nama: string; dosenId: string }>,
): Promise<Kelas> {
  const row = await prisma.kelas.update({
    where: { id },
    data,
    include: { mahasiswa: { select: { id: true } } },
  });
  return mapKelas(row);
}

export async function deleteKelas(id: string): Promise<void> {
  await prisma.kelas.delete({ where: { id } });
}

/* ---------- Progress ---------- */
export async function listProgress(): Promise<Progress[]> {
  const rows = await prisma.progress.findMany();
  return rows.map(mapProgress);
}

export async function listProgressByUser(userId: string): Promise<Progress[]> {
  const rows = await prisma.progress.findMany({ where: { userId } });
  return rows.map(mapProgress);
}

export async function progressOf(userId: string, topicId: string): Promise<Progress | null> {
  const row = await prisma.progress.findUnique({
    where: { userId_topicId: { userId, topicId } },
  });
  return row ? mapProgress(row) : null;
}

export async function upsertProgress(entry: Progress): Promise<Progress> {
  const row = await prisma.progress.upsert({
    where: { userId_topicId: { userId: entry.userId, topicId: entry.topicId } },
    create: {
      userId: entry.userId,
      topicId: entry.topicId,
      mastery: entry.mastery,
      attempts: entry.attempts,
      solved: entry.solved,
      xp: entry.xp,
      updatedAt: new Date(),
    },
    update: {
      mastery: entry.mastery,
      attempts: entry.attempts,
      solved: entry.solved,
      xp: entry.xp,
      updatedAt: new Date(),
    },
  });
  return mapProgress(row);
}

/* ---------- History ---------- */
export async function listHistory(): Promise<HistoryRecord[]> {
  const rows = await prisma.historyRecord.findMany({ orderBy: { createdAt: "desc" } });
  return rows.map(mapHistory);
}

export async function listHistoryByUser(userId: string): Promise<HistoryRecord[]> {
  const rows = await prisma.historyRecord.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(mapHistory);
}

export async function addHistory(
  partial: Omit<HistoryRecord, "id" | "createdAt">,
): Promise<HistoryRecord> {
  const row = await prisma.historyRecord.create({
    data: {
      id: uid("h-"),
      userId: partial.userId,
      kind: partial.kind,
      title: partial.title,
      summary: partial.summary,
      score: partial.score ?? null,
      xp: partial.xp ?? null,
    },
  });
  return mapHistory(row);
}

/* ---------- Activity log ---------- */
export async function listLogs(): Promise<ActivityLog[]> {
  const rows = await prisma.activityLog.findMany({ orderBy: { createdAt: "desc" } });
  return rows.map(mapLog);
}

export async function recordActivity(
  partial: Omit<ActivityLog, "id" | "createdAt">,
): Promise<ActivityLog> {
  const row = await prisma.activityLog.create({
    data: {
      id: uid("l-"),
      userId: partial.userId ?? null,
      actorName: partial.actorName,
      action: partial.action,
      target: partial.target,
      severity: partial.severity,
    },
  });
  return mapLog(row);
}

/* ---------- Materials ---------- */
export async function listMaterials(): Promise<MaterialItem[]> {
  const rows = await prisma.materialItem.findMany({ orderBy: { updatedAt: "desc" } });
  return rows.map(mapMaterial);
}

export async function createMaterial(data: {
  id: string;
  kelasId: string;
  topicId: string;
  type: MaterialType;
  title: string;
  content: string;
  difficulty?: Difficulty;
  createdBy: string;
}): Promise<MaterialItem> {
  const row = await prisma.materialItem.create({
    data: {
      id: data.id,
      kelasId: data.kelasId,
      topicId: data.topicId,
      type: data.type,
      title: data.title,
      content: data.content,
      difficulty: data.difficulty ?? null,
      createdBy: data.createdBy,
    },
  });
  return mapMaterial(row);
}

export async function updateMaterial(
  id: string,
  data: Partial<{
    kelasId: string;
    topicId: string;
    type: MaterialType;
    title: string;
    content: string;
    difficulty: Difficulty | null;
  }>,
): Promise<MaterialItem> {
  const row = await prisma.materialItem.update({
    where: { id },
    data: { ...data, updatedAt: new Date() },
  });
  return mapMaterial(row);
}

export async function deleteMaterial(id: string): Promise<void> {
  await prisma.materialItem.delete({ where: { id } });
}

/* ---------- Formulas ---------- */
export async function createFormula(data: {
  id: string;
  userId: string;
  expression: string;
  display: string;
  topicId?: string;
}): Promise<FormulaRecord> {
  const row = await prisma.formulaRecord.create({
    data: {
      id: data.id,
      userId: data.userId,
      expression: data.expression,
      display: data.display,
      topicId: data.topicId ?? null,
    },
  });
  return mapFormula(row);
}

export async function listFormulasByUser(userId: string): Promise<FormulaRecord[]> {
  const rows = await prisma.formulaRecord.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(mapFormula);
}

/* ---------- AIConfig ---------- */
export async function getAIConfig(): Promise<AIConfig | null> {
  const row = await prisma.aIConfig.findFirst({ orderBy: { updatedAt: "desc" } });
  return row ? mapAIConfig(row) : null;
}

export async function updateAIConfig(data: {
  model: string;
  temperature: number;
  maxTokens: number;
  features: { stepExplain: boolean; adaptiveQuiz: boolean; graphSimulation: boolean };
  systemPrompt: string;
}): Promise<AIConfig> {
  const current = await prisma.aIConfig.findFirst();
  if (!current) throw new Error("Konfigurasi AI belum ada");
  const row = await prisma.aIConfig.update({
    where: { id: current.id },
    data: {
      model: data.model,
      temperature: data.temperature,
      maxTokens: data.maxTokens,
      stepExplain: data.features.stepExplain,
      adaptiveQuiz: data.features.adaptiveQuiz,
      graphSimulation: data.features.graphSimulation,
      systemPrompt: data.systemPrompt,
      updatedAt: new Date(),
    },
  });
  return mapAIConfig(row);
}
