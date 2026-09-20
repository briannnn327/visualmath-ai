/* =========================================================
   TanStack Query hooks — konsumen API route (client)
   ========================================================= */

"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
  Topic,
} from "@/lib/types";
import type { AIConfigInput, MaterialInput, UserAdminInput } from "@/lib/schemas";

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
  uptime: number;
  models: number;
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
    mutationFn: (input: { expression: string; variable?: string; topicId?: string; title?: string }) =>
      api.post<{ analysis: FormulaAnalysis; record: FormulaRecord }>("/api/formulas", input),
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

/* ---------- Latihan adaptif ---------- */

export function useQuestion(topicId: string | null, difficulty: Difficulty, enabled = true) {
  return useQuery({
    queryKey: ["question", topicId, difficulty],
    queryFn: async () =>
      api.get<{ question: SafeQuestion | null; difficultyOrder: Difficulty[] }>(
        qs("/api/exercises", { topicId: topicId ?? undefined, difficulty })
      ),
    enabled: enabled && Boolean(topicId),
  });
}

export function useCheckAnswer() {
  return useMutation({
    mutationFn: (input: { questionId: string; topicId: string; answer: string; timeMs?: number }) =>
      api.post<{ result: AnswerResult; mastery: number }>("/api/exercises/answer", input),
  });
}

export function useCompleteExercise() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      topicId: string;
      total: number;
      correct: number;
      xp: number;
      finishReason?: "selesai" | "quit";
    }) => api.post<{ history: HistoryRecord; score: number }>("/api/exercises/complete", input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["topics"] });
    },
  });
}

/* ---------- Materi (dosen & admin) ---------- */

export function useMaterials(kelasId: string | null = null) {
  return useQuery({
    queryKey: ["materials", kelasId ?? "all"],
    queryFn: async () => {
      const { materials } = await api.get<{ materials: MaterialWithMeta[] }>(
        qs("/api/materials", { kelasId: kelasId ?? undefined })
      );
      return materials;
    },
  });
}

export function useCreateMaterial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: MaterialInput) => api.post<{ material: MaterialWithMeta }>("/api/materials", input),
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
        qs("/api/classes", { detail: kelasId ?? undefined })
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
        qs("/api/system", { q: "logs", severity: severity ?? undefined })
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