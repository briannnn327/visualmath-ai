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
  QuestionType,
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

/* ---------- Reset kata sandi ---------- */

export async function updateUserPassword(userId: string, passwordHash: string): Promise<void> {
  await prisma.user.update({ where: { id: userId }, data: { password: passwordHash } });
}

/** Buat token reset baru; menghapus token lama milik pengguna agar hanya satu yang aktif. */
export async function createPasswordReset(data: {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
}): Promise<void> {
  await prisma.$transaction([
    prisma.passwordResetToken.deleteMany({ where: { userId: data.userId } }),
    prisma.passwordResetToken.create({
      data: {
        id: data.id,
        userId: data.userId,
        tokenHash: data.tokenHash,
        expiresAt: data.expiresAt,
      },
    }),
  ]);
}

export async function findPasswordResetByHash(tokenHash: string): Promise<{
  id: string;
  userId: string;
  expiresAt: Date;
  usedAt: Date | null;
} | null> {
  const row = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });
  if (!row) return null;
  return { id: row.id, userId: row.userId, expiresAt: row.expiresAt, usedAt: row.usedAt };
}

export async function markPasswordResetUsed(id: string): Promise<void> {
  await prisma.passwordResetToken.update({ where: { id }, data: { usedAt: new Date() } });
}

export async function deletePasswordResetsForUser(userId: string): Promise<void> {
  await prisma.passwordResetToken.deleteMany({ where: { userId } });
}

/* ---------- Sesi (revocable) ---------- */

export interface SessionRecord {
  id: string;
  userId: string;
  userAgent: string | null;
  ip: string | null;
  expiresAt: Date;
  revokedAt: Date | null;
  createdAt: Date;
}

export async function createSessionRecord(data: {
  id: string;
  userId: string;
  userAgent?: string | null;
  ip?: string | null;
  expiresAt: Date;
}): Promise<void> {
  await prisma.session.create({
    data: {
      id: data.id,
      userId: data.userId,
      userAgent: data.userAgent ?? null,
      ip: data.ip ?? null,
      expiresAt: data.expiresAt,
    },
  });
}

/** Ambil sesi aktif; mengembalikan null bila tidak ada, sudah dicabut, atau kedaluwarsa. */
export async function getActiveSession(id: string): Promise<SessionRecord | null> {
  const row = await prisma.session.findUnique({ where: { id } });
  if (!row) return null;
  if (row.revokedAt) return null;
  if (row.expiresAt.getTime() <= Date.now()) return null;
  return row;
}

export async function revokeSession(id: string): Promise<void> {
  await prisma.session.updateMany({
    where: { id, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

/** Cabut seluruh sesi aktif seorang pengguna (mis. setelah ganti kata sandi). */
export async function revokeSessionsForUser(userId: string): Promise<number> {
  const res = await prisma.session.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  return res.count;
}

export async function listSessionsForUser(userId: string): Promise<SessionRecord[]> {
  return prisma.session.findMany({ where: { userId }, orderBy: { createdAt: "desc" } });
}

export async function listAllActiveSessions(): Promise<SessionRecord[]> {
  return prisma.session.findMany({
    where: { revokedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
}

/** Hapus sesi kedaluwarsa/dicabut lama (pemeliharaan). */
export async function pruneSessions(): Promise<number> {
  const res = await prisma.session.deleteMany({
    where: {
      OR: [
        { expiresAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
        { revokedAt: { not: null } },
      ],
    },
  });
  return res.count;
}

/* ---------- Notifikasi (in-app) ---------- */

export interface NotificationRecord {
  id: string;
  kind: string;
  title: string;
  body: string;
  href: string | null;
  readAt: Date | null;
  createdAt: Date;
}

export async function createNotification(data: {
  id: string;
  userId: string;
  kind?: "info" | "success" | "warning" | "error";
  title: string;
  body: string;
  href?: string | null;
}): Promise<void> {
  await prisma.notification.create({
    data: {
      id: data.id,
      userId: data.userId,
      kind: data.kind ?? "info",
      title: data.title,
      body: data.body,
      href: data.href ?? null,
    },
  });
}

export async function listNotifications(userId: string, limit = 30): Promise<NotificationRecord[]> {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function countUnreadNotifications(userId: string): Promise<number> {
  return prisma.notification.count({ where: { userId, readAt: null } });
}

export async function markNotificationRead(userId: string, id: string): Promise<void> {
  await prisma.notification.updateMany({
    where: { id, userId, readAt: null },
    data: { readAt: new Date() },
  });
}

export async function markAllNotificationsRead(userId: string): Promise<number> {
  const res = await prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });
  return res.count;
}

export async function deleteNotification(userId: string, id: string): Promise<void> {
  await prisma.notification.deleteMany({ where: { id, userId } });
}

/* ---------- Sertifikat ---------- */

export interface CertificateRecord {
  id: string;
  userId: string;
  topicId: string;
  topicTitle: string;
  score: number;
  xp: number;
  recipientName: string;
  identity: string | null;
  code: string;
  issuedAt: Date;
}

export async function createCertificate(data: {
  id: string;
  userId: string;
  topicId: string;
  topicTitle: string;
  score: number;
  xp: number;
  recipientName: string;
  identity?: string | null;
  code: string;
}): Promise<CertificateRecord> {
  return prisma.certificate.create({
    data: {
      id: data.id,
      userId: data.userId,
      topicId: data.topicId,
      topicTitle: data.topicTitle,
      score: data.score,
      xp: data.xp,
      recipientName: data.recipientName,
      identity: data.identity ?? null,
      code: data.code,
    },
  });
}

export async function getCertificateById(id: string): Promise<CertificateRecord | null> {
  return prisma.certificate.findUnique({ where: { id } });
}

export async function listCertificatesForUser(userId: string): Promise<CertificateRecord[]> {
  return prisma.certificate.findMany({
    where: { userId },
    orderBy: { issuedAt: "desc" },
  });
}

/** Sertifikat terbaru untuk (user, topik) — dipakai mencegah duplikat per topik. */
export async function findCertificateForTopic(
  userId: string,
  topicId: string,
): Promise<CertificateRecord | null> {
  return prisma.certificate.findFirst({
    where: { userId, topicId },
    orderBy: { issuedAt: "desc" },
  });
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

export async function createTopic(data: {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  icon: string;
  color: string;
  order: number;
}): Promise<Topic> {
  const row = await prisma.topic.create({
    data: { ...data, formulaCount: 0, questionCount: 0 },
  });
  return mapTopic(row);
}

export async function updateTopic(
  id: string,
  data: Partial<{
    slug: string;
    title: string;
    subtitle: string;
    description: string;
    icon: string;
    color: string;
    order: number;
  }>,
): Promise<Topic> {
  const row = await prisma.topic.update({ where: { id }, data });
  return mapTopic(row);
}

export async function deleteTopic(id: string): Promise<void> {
  await prisma.topic.delete({ where: { id } });
}

/* ---------- Questions ---------- */
export async function listQuestions(): Promise<Question[]> {
  const rows = await prisma.question.findMany();
  return rows.map(mapQuestion);
}

export async function getQuestionById(id: string): Promise<Question | null> {
  const row = await prisma.question.findUnique({ where: { id } });
  return row ? mapQuestion(row) : null;
}

export async function createQuestion(data: {
  id: string;
  topicId: string;
  difficulty: Difficulty;
  type: QuestionType;
  prompt: string;
  latex?: string | null;
  options?: string[];
  expectedAnswer: string;
  explanation: string;
  hint?: string | null;
}): Promise<Question> {
  const row = await prisma.question.create({
    data: {
      id: data.id,
      topicId: data.topicId,
      difficulty: data.difficulty,
      type: data.type,
      prompt: data.prompt,
      latex: data.latex ?? null,
      options: data.options ?? [],
      expectedAnswer: data.expectedAnswer,
      explanation: data.explanation,
      hint: data.hint ?? null,
    },
  });
  return mapQuestion(row);
}

export async function updateQuestion(
  id: string,
  data: Partial<{
    topicId: string;
    difficulty: Difficulty;
    type: QuestionType;
    prompt: string;
    latex: string | null;
    options: string[];
    expectedAnswer: string;
    explanation: string;
    hint: string | null;
  }>,
): Promise<Question> {
  const row = await prisma.question.update({ where: { id }, data });
  return mapQuestion(row);
}

export async function deleteQuestion(id: string): Promise<void> {
  await prisma.question.delete({ where: { id } });
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

/** Cari kelas berdasarkan kode (case-insensitive, huruf besar). */
export async function getKelasByKode(kode: string): Promise<Kelas | null> {
  const row = await prisma.kelas.findFirst({
    where: { kode: { equals: kode.trim().toUpperCase(), mode: "insensitive" } },
    include: { mahasiswa: { select: { id: true } } },
  });
  return row ? mapKelas(row) : null;
}

/**
 * Gabungkan seorang mahasiswa ke kelas lewat kode. Menyambungkan relasi
 * `mahasiswa` dan menyetel `User.kelasId`. Mengembalikan kelas yang diikuti.
 */
export async function joinKelasByKode(userId: string, kode: string): Promise<Kelas | null> {
  const kelas = await getKelasByKode(kode);
  if (!kelas) return null;
  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { kelasId: kelas.id } }),
    prisma.kelas.update({
      where: { id: kelas.id },
      data: { mahasiswa: { connect: { id: userId } } },
    }),
  ]);
  return getKelasById(kelas.id);
}

/** Keluarkan mahasiswa dari kelasnya (lepas relasi & kelasId). */
export async function leaveKelas(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.kelasId) return;
  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { kelasId: null } }),
    prisma.kelas.update({
      where: { id: user.kelasId },
      data: { mahasiswa: { disconnect: { id: userId } } },
    }),
  ]);
}

/** Tambahkan mahasiswa ke kelas (dipakai dosen/admin). */
export async function addKelasMember(kelasId: string, userId: string): Promise<void> {
  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { kelasId } }),
    prisma.kelas.update({
      where: { id: kelasId },
      data: { mahasiswa: { connect: { id: userId } } },
    }),
  ]);
}

/** Keluarkan mahasiswa dari kelas tanpa menghapus akunnya. */
export async function removeKelasMember(kelasId: string, userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { kelasId: true },
  });
  if (!user || user.kelasId !== kelasId) return;
  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { kelasId: null } }),
    prisma.kelas.update({
      where: { id: kelasId },
      data: { mahasiswa: { disconnect: { id: userId } } },
    }),
  ]);
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

/**
 * Hapus kelas beserta ketergantungannya secara aman:
 * lepaskan referensi anggota (User.kelasId) dan materi yang menempel,
 * agar tidak menabrak constraint foreign key.
 */
export async function deleteKelas(id: string): Promise<void> {
  await prisma.$transaction([
    prisma.user.updateMany({ where: { kelasId: id }, data: { kelasId: null } }),
    prisma.materialItem.deleteMany({ where: { kelasId: id } }),
    prisma.kelas.delete({ where: { id } }),
  ]);
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

/* ---------- Question attempts ---------- */

/** Apakah soal ini sudah dijawab pada sesi yang sama? */
export async function hasSessionAttempt(sessionId: string, questionId: string): Promise<boolean> {
  const row = await prisma.questionAttempt.findUnique({
    where: { sessionId_questionId: { sessionId, questionId } },
    select: { id: true },
  });
  return row !== null;
}

/** Apakah mahasiswa pernah menjawab benar soal ini (di sesi mana pun)? */
export async function hasCorrectAttempt(userId: string, questionId: string): Promise<boolean> {
  const row = await prisma.questionAttempt.findFirst({
    where: { userId, questionId, correct: true },
    select: { id: true },
  });
  return row !== null;
}

/** Catat satu jawaban. Unique index sesi+soal menjaga dari duplikasi balapan. */
export async function recordQuestionAttempt(data: {
  id: string;
  userId: string;
  sessionId: string;
  questionId: string;
  topicId: string;
  difficulty: Difficulty;
  correct: boolean;
  xpEarned: number;
  timeMs: number;
}): Promise<void> {
  await prisma.questionAttempt.create({
    data: {
      id: data.id,
      userId: data.userId,
      sessionId: data.sessionId,
      questionId: data.questionId,
      topicId: data.topicId,
      difficulty: data.difficulty,
      correct: data.correct,
      xpEarned: data.xpEarned,
      timeMs: data.timeMs,
    },
  });
}

/** Rekap sesi dari catatan server, bukan dari nilai yang dikirim klien. */
export async function sessionSummary(
  userId: string,
  sessionId: string,
  topicId: string,
): Promise<{ total: number; correct: number; xp: number }> {
  const rows = await prisma.questionAttempt.findMany({
    where: { userId, sessionId, topicId },
    select: { correct: true, xpEarned: true },
  });
  return {
    total: rows.length,
    correct: rows.filter((r) => r.correct).length,
    xp: rows.reduce((sum, r) => sum + r.xpEarned, 0),
  };
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

/** Hapus satu riwayat formula; hanya milik pengguna itu sendiri. */
export async function deleteFormula(id: string, userId: string): Promise<boolean> {
  const res = await prisma.formulaRecord.deleteMany({ where: { id, userId } });
  return res.count > 0;
}

/* ---------- AIConfig ---------- */
export async function getAIConfig(): Promise<AIConfig | null> {
  const row = await prisma.aIConfig.findFirst({ orderBy: { updatedAt: "desc" } });
  return row ? mapAIConfig(row) : null;
}

export async function updateAIConfig(data: {
  provider: string;
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
      provider: data.provider,
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
