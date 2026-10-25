/* =========================================================
   TanStack Query hooks — konsumen API route (client)
   ========================================================= */

"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  AIConfigInput,
  MaterialInput,
  QuestionAdminInput,
  TopicAdminInput,
  UserAdminInput,
} from "@/lib/schemas";
import { api, qs } from "@/lib/services/api";
import type {
  ActivityLog,
  AIConfig,
  AnswerResult,
  Difficulty,
  FormulaAnalysis,
  FormulaRecord,
  HistoryRecord,
  Kelas,
  MaterialItem,
  PublicUser,
  Question,
  RagCitation,
  Topic,
} from "@/lib/types";

/* ---------- Tipe pengembalian API ---------- */

export type TopicWithCounts = Topic & { counts: Record<Difficulty, number> };
export type SafeQuestion = Omit<Question, "expectedAnswer"> & { topicTitle: string };
export type MaterialWithMeta = MaterialItem & { topicTitle: string; kelasName: string };
export type AdminUser = PublicUser & { kelasName?: string; kelasKode?: string };
export type ClassWithStats = Kelas & { studentCount: number; avgMastery: number };
export interface RosterRowPublic {
  user: PublicUser;
  rows: Array<{ topic: Topic; mastery: number }>;
  avg: number;
  xp: number;
  lastActive: string;
}

export interface ProfileResponse {
  user: PublicUser;
  kelas?: Kelas;
  stats: { totalXp: number; topicsStarted: number; solved: number; quizzes: number };
  kelasProgress: Array<{ userId: string; avg: number }>;
}

export interface SystemMetrics {
  totalUsers: number;
  activeToday: number;
  requestsToday: number;
  errorsToday: number;
  warningsToday: number;
  avgResponseMs: number;
  latencySamples: number;
  uptimeSec: number;
  activeModel: string;
  activeProvider: string;
}

/* ---------- Topik ---------- */

export function useTopics() {
  return useQuery({
    queryKey: ["topics"],
    queryFn: async () => {
      const { topics } = await api.get<{ topics: TopicWithCounts[] }>("/api/topics");
      return topics;
    },
  });
}

/* ---------- AI Explainer ---------- */

export function useFormulaAnalyze() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      expression: string;
      variable?: string;
      topicId?: string;
      title?: string;
    }) => api.post<{ analysis: FormulaAnalysis; record: FormulaRecord }>("/api/formulas", input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["formula-history"] });
    },
  });
}

export function useFormulaHistory(enabled = true) {
  return useQuery({
    queryKey: ["formula-history"],
    queryFn: async () => {
      const { records } = await api.get<{ records: FormulaRecord[] }>("/api/formulas");
      return records;
    },
    enabled,
  });
}

export function useDeleteFormula() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del<{ ok: boolean }>("/api/formulas", { id }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["formula-history"] });
    },
  });
}

/* ---------- Scan foto soal (OCR/vision) ---------- */

export interface ScanResult {
  expression: string;
  latex: string;
  note: string;
  confidence: number;
  topicId: string | null;
  topicSlug: string | null;
  topicTitle: string | null;
  model: string;
  analyzable: boolean;
}

export function useScanSoal() {
  return useMutation({
    mutationFn: (input: { image: string }) => api.post<{ scan: ScanResult }>("/api/scan", input),
  });
}

/* ---------- Latihan adaptif ---------- */

export function useQuestion(
  topicId: string | null,
  difficulty: Difficulty,
  enabled = true,
  exclude = "",
  attempt = 0,
  sessionId = "",
) {
  return useQuery({
    queryKey: ["question", sessionId, topicId, difficulty, attempt, exclude],
    queryFn: async () =>
      api.get<{ question: SafeQuestion | null; difficultyOrder: Difficulty[] }>(
        qs("/api/exercises", {
          topicId: topicId ?? undefined,
          difficulty,
          exclude: exclude || undefined,
        }),
      ),
    enabled: enabled && Boolean(topicId),
  });
}

export function useCheckAnswer() {
  return useMutation({
    mutationFn: (input: {
      questionId: string;
      topicId: string;
      sessionId: string;
      answer: string;
      timeMs?: number;
    }) => api.post<{ result: AnswerResult; mastery: number }>("/api/exercises/answer", input),
  });
}

export interface CompleteExerciseResult {
  history: HistoryRecord | null;
  score: number;
  total: number;
  correct: number;
  xp: number;
  certificateId: string | null;
}

export function useCompleteExercise() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      topicId: string;
      sessionId: string;
      finishReason?: "selesai" | "quit";
    }) => api.post<CompleteExerciseResult>("/api/exercises/complete", input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["topics"] });
      void qc.invalidateQueries({ queryKey: ["profile"] });
      void qc.invalidateQueries({ queryKey: ["history"] });
    },
  });
}

export interface ExerciseAIResult {
  text: string;
  keyPoints: string[];
  source: "ai" | "static";
  model?: string;
  references: RagCitation[];
}

export function useExerciseHint() {
  return useMutation({
    mutationFn: (input: { questionId: string; topicId: string }) =>
      api.post<{ help: ExerciseAIResult }>("/api/exercises/hint", input),
  });
}

export function useExerciseExplain() {
  return useMutation({
    mutationFn: (input: { questionId: string; topicId: string }) =>
      api.post<{ help: ExerciseAIResult }>("/api/exercises/explain", input),
  });
}

/* ---------- Materi (dosen & admin) ---------- */

export function useMaterials(kelasId: string | null = null) {
  return useQuery({
    queryKey: ["materials", kelasId ?? "all"],
    queryFn: async () => {
      const { materials } = await api.get<{ materials: MaterialWithMeta[] }>(
        qs("/api/materials", { kelasId: kelasId ?? undefined }),
      );
      return materials;
    },
  });
}

export function useCreateMaterial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: MaterialInput) =>
      api.post<{ material: MaterialWithMeta }>("/api/materials", input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["materials"] });
    },
  });
}

export function useUpdateMaterial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...rest }: MaterialInput & { id: string }) =>
      api.patch<{ material: MaterialWithMeta }>("/api/materials", { id, ...rest }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["materials"] });
    },
  });
}

export function useDeleteMaterial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del<{ ok: boolean }>("/api/materials", { id }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["materials"] });
    },
  });
}

export interface EmbeddingStatus {
  total: number;
  embedded: number;
  missing: number;
  chunks: number;
  aiConfigured: boolean;
}

export interface BackfillSummary {
  total: number;
  processed: number;
  embedded: number;
  failed: number;
  skipped: number;
  aiConfigured: boolean;
}

export function useEmbeddingStatus(enabled = true) {
  return useQuery({
    queryKey: ["embedding-status"],
    enabled,
    queryFn: async () =>
      (await api.get<{ status: EmbeddingStatus }>("/api/materials/embeddings")).status,
  });
}

export function useBackfillEmbeddings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { onlyMissing?: boolean } = {}) =>
      api.post<{ summary: BackfillSummary }>("/api/materials/embeddings", input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["embedding-status"] });
    },
  });
}

/* ---------- Kelas (dosen & admin) ---------- */

export function useClasses() {
  return useQuery({
    queryKey: ["classes"],
    queryFn: async () => {
      const { classes } = await api.get<{ classes: ClassWithStats[] }>("/api/classes");
      return classes;
    },
  });
}

export function useClassRoster(kelasId: string | null) {
  return useQuery({
    queryKey: ["classes", "roster", kelasId],
    enabled: !!kelasId,
    queryFn: async () => {
      const { roster } = await api.get<{ roster: RosterRowPublic[] }>(
        qs("/api/classes", { detail: kelasId ?? undefined }),
      );
      return roster;
    },
  });
}

export function useCreateClass() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { kode: string; nama: string; dosenId: string }) =>
      api.post<{ class: ClassWithStats }>("/api/classes", input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["classes"] });
    },
  });
}

export function useUpdateClass() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...rest }: { id: string; kode: string; nama: string; dosenId: string }) =>
      api.patch<{ class: ClassWithStats }>("/api/classes", { id, ...rest }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["classes"] });
    },
  });
}

export function useDeleteClass() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del<{ ok: boolean }>("/api/classes", { id }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["classes"] });
    },
  });
}

export function useClassMembers(kelasId: string | null) {
  return useQuery({
    queryKey: ["classes", "members", kelasId],
    enabled: !!kelasId,
    queryFn: async () => {
      const { members } = await api.get<{ members: PublicUser[] }>(
        `/api/classes/${kelasId}/members`,
      );
      return members;
    },
  });
}

export function useAddClassMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ kelasId, query }: { kelasId: string; query: string }) =>
      api.post<{ member: PublicUser }>(`/api/classes/${kelasId}/members`, { query }),
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: ["classes"] });
      void qc.invalidateQueries({ queryKey: ["classes", "members", vars.kelasId] });
    },
  });
}

export function useRemoveClassMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ kelasId, userId }: { kelasId: string; userId: string }) =>
      api.del<{ ok: boolean }>(`/api/classes/${kelasId}/members`, { userId }),
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: ["classes"] });
      void qc.invalidateQueries({ queryKey: ["classes", "members", vars.kelasId] });
    },
  });
}

/* ---------- Pengguna (admin) ---------- */

export function useAdminUsers() {
  return useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { users } = await api.get<{ users: AdminUser[] }>("/api/users");
      return users;
    },
  });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UserAdminInput) => api.post<{ user: AdminUser }>("/api/users", input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...rest }: UserAdminInput & { id: string }) =>
      api.patch<{ user: AdminUser }>("/api/users", { id, ...rest }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
  });
}

export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del<{ ok: boolean }>("/api/users", { id }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
  });
}

/* ---------- Konfigurasi AI (admin) ---------- */

export function useAIConfig() {
  return useQuery({
    queryKey: ["ai-config"],
    queryFn: async () => {
      const { config } = await api.get<{ config: AIConfig }>("/api/ai-config");
      return config;
    },
  });
}

export function useUpdateAIConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: AIConfigInput) => api.patch<{ config: AIConfig }>("/api/ai-config", input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["ai-config"] });
    },
  });
}

/* ---------- Monitoring sistem (admin) ---------- */

export function useSystemMetrics() {
  return useQuery({
    queryKey: ["system-metrics"],
    queryFn: async () => {
      const { metrics } = await api.get<{ metrics: SystemMetrics }>("/api/system?q=metrics");
      return metrics;
    },
    refetchInterval: 60_000,
  });
}

export function useSystemLogs(severity?: string) {
  return useQuery({
    queryKey: ["system-logs", severity ?? "all"],
    queryFn: async () => {
      const { logs } = await api.get<{ logs: ActivityLog[] }>(
        qs("/api/system", { q: "logs", severity: severity ?? undefined }),
      );
      return logs;
    },
  });
}

/* ---------- Profil ---------- */

export function useProfile() {
  return useQuery({
    queryKey: ["profile"],
    queryFn: async () => api.get<ProfileResponse>("/api/profile"),
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; nim?: string; prodi?: string; password?: string }) =>
      api.patch<{ user: PublicUser }>("/api/profile", input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["profile"] });
      void qc.invalidateQueries({ queryKey: ["topics"] });
    },
  });
}

/* ---------- Gabung kelas (mahasiswa) ---------- */

export function useJoinClass() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { kode: string }) => api.post<{ kelas: Kelas }>("/api/classes/join", input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["profile"] });
      void qc.invalidateQueries({ queryKey: ["classes"] });
    },
  });
}

export function useLeaveClass() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.del<{ ok: boolean }>("/api/classes/join"),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["profile"] });
      void qc.invalidateQueries({ queryKey: ["classes"] });
    },
  });
}

/* ---------- CRUD Topik (admin) ---------- */

export function useCreateTopic() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: TopicAdminInput) => api.post<{ topic: Topic }>("/api/topics", input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["topics"] });
    },
  });
}

export function useUpdateTopic() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...rest }: TopicAdminInput & { id: string }) =>
      api.patch<{ topic: Topic }>("/api/topics", { id, ...rest }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["topics"] });
    },
  });
}

export function useDeleteTopic() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del<{ ok: boolean }>("/api/topics", { id }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["topics"] });
      void qc.invalidateQueries({ queryKey: ["admin-questions"] });
    },
  });
}

/* ---------- CRUD Soal (admin) ---------- */

export function useAdminQuestions(topicId: string | null = null) {
  return useQuery({
    queryKey: ["admin-questions", topicId ?? "all"],
    queryFn: async () => {
      const { questions } = await api.get<{ questions: Question[] }>(
        qs("/api/questions", { topicId: topicId ?? undefined }),
      );
      return questions;
    },
  });
}

export function useCreateQuestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: QuestionAdminInput) =>
      api.post<{ question: Question }>("/api/questions", input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin-questions"] });
      void qc.invalidateQueries({ queryKey: ["topics"] });
    },
  });
}

export function useUpdateQuestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...rest }: QuestionAdminInput & { id: string }) =>
      api.patch<{ question: Question }>("/api/questions", { id, ...rest }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin-questions"] });
      void qc.invalidateQueries({ queryKey: ["topics"] });
    },
  });
}

export function useDeleteQuestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del<{ ok: boolean }>("/api/questions", { id }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin-questions"] });
      void qc.invalidateQueries({ queryKey: ["topics"] });
    },
  });
}

/* ---------- Rate limit (admin) ---------- */

export interface RateLimitUsage {
  bucket: string;
  key: string;
  count: number;
  oldest: string | null;
}
export interface RateLimitInfo {
  rules: Array<{ bucket: string; limit: number; windowMinutes: number }>;
  usage: RateLimitUsage[];
}

export function useRateLimits() {
  return useQuery({
    queryKey: ["rate-limits"],
    queryFn: () => api.get<RateLimitInfo>("/api/admin/rate-limits"),
    refetchInterval: 60_000,
  });
}

/* ---------- Notifikasi (in-app) ---------- */

export interface NotificationItem {
  id: string;
  kind: "info" | "success" | "warning" | "error";
  title: string;
  body: string;
  href: string | null;
  read: boolean;
  createdAt: string;
}

export function useNotifications() {
  return useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const data = await api.get<{ notifications: NotificationItem[]; unread: number }>(
        "/api/notifications",
      );
      return data;
    },
    refetchInterval: 60_000,
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { id?: string; all?: boolean }) =>
      api.patch<{ ok: boolean }>("/api/notifications", input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useDeleteNotification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del<{ ok: boolean }>("/api/notifications", { id }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

/* ---------- Sesi (revocable) ---------- */

export interface SessionListItem {
  id: string;
  userAgent: string | null;
  ip: string | null;
  createdAt: string;
  expiresAt: string;
  current: boolean;
}

export function useSessions() {
  return useQuery({
    queryKey: ["sessions"],
    queryFn: async () => {
      const { sessions } = await api.get<{ sessions: SessionListItem[] }>("/api/sessions");
      return sessions;
    },
  });
}

export function useRevokeSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { id?: string; all?: boolean }) =>
      api.del<{ ok: boolean }>("/api/sessions", input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["sessions"] });
    },
  });
}
