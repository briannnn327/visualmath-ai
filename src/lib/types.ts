/* =========================================================
   Tipe domain VisualMath AI
   - Branded types untuk ID (Modul 3)
   - Discriminated unions untuk state async (Modul 3)
   ========================================================= */

export type Role = "mahasiswa" | "dosen" | "admin";
export type Difficulty = "mudah" | "sedang" | "sulit";
export type QuestionType = "numeric" | "choice" | "truefalse";
export type MaterialType = "materi" | "soal";
export type ActivityKind =
  | "formula"
  | "quiz"
  | "lesson"
  | "auth"
  | "graph"
  | "system";

/* ---------- Branded types ---------- */
export type Brand<T, B extends string> = T & { readonly __brand: B };

export type UserId = Brand<string, "UserId">;
export type TopicId = Brand<string, "TopicId">;
export type QuestionId = Brand<string, "QuestionId">;
export type KelasId = Brand<string, "KelasId">;
export type MaterialId = Brand<string, "MaterialId">;
export type FormulaId = Brand<string, "FormulaId">;
export type HistoryId = Brand<string, "HistoryId">;
export type LogId = Brand<string, "LogId">;
export type ConfigId = Brand<string, "ConfigId">;

/* ---------- Discriminated union state async ---------- */
export type AsyncState<T> =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: T }
  | { status: "error"; error: string };

/* ---------- Entities ---------- */
export interface User {
  id: UserId;
  name: string;
  email: string;
  password: string;
  role: Role;
  nim?: string;
  prodi?: string;
  kelasId?: KelasId;
  color: string;
  createdAt: string;
}

export type PublicUser = Omit<User, "password">;

export interface SessionInfo {
  userId: UserId;
  role: Role;
  name: string;
  email: string;
  expires: number;
}

export interface Kelas {
  id: KelasId;
  kode: string;
  nama: string;
  dosenId: UserId;
  mahasiswaIds: UserId[];
  createdAt: string;
}

export interface Topic {
  id: TopicId;
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  icon: string;
  color: string;
  formulaCount: number;
  questionCount: number;
  order: number;
}

export interface Question {
  id: QuestionId;
  topicId: TopicId;
  difficulty: Difficulty;
  type: QuestionType;
  prompt: string;
  latex?: string;
  options?: string[];
  expectedAnswer: string;
  explanation: string;
  hint?: string;
}

export interface QuestionWithTopic extends Question {
  topicTitle: string;
}

export interface Progress {
  userId: UserId;
  topicId: TopicId;
  mastery: number;
  attempts: number;
  solved: number;
  xp: number;
  updatedAt: string;
}

export interface HistoryRecord {
  id: HistoryId;
  userId: UserId;
  kind: ActivityKind;
  title: string;
  summary: string;
  score?: number;
  xp?: number;
  createdAt: string;
}

export interface ActivityLog {
  id: LogId;
  userId?: UserId;
  actorName: string;
  action: string;
  target: string;
  severity: "info" | "warning" | "error";
  createdAt: string;
}

export interface AIConfig {
  id: ConfigId;
  model: string;
  temperature: number;
  maxTokens: number;
  features: {
    stepExplain: boolean;
    adaptiveQuiz: boolean;
    graphSimulation: boolean;
  };
  systemPrompt: string;
  updatedAt: string;
}

export interface MaterialItem {
  id: MaterialId;
  kelasId: KelasId;
  topicId: TopicId;
  type: MaterialType;
  title: string;
  content: string;
  difficulty?: Difficulty;
  createdBy: UserId;
  updatedAt: string;
}

export interface FormulaRecord {
  id: FormulaId;
  userId: UserId;
  expression: string;
  display: string;
  topicId?: TopicId;
  createdAt: string;
}

/* ---------- Analysis & grafik ---------- */
export interface MathPoint {
  x: number;
  y: number;
}

export interface MathSegment {
  points: MathPoint[];
}

export interface SpecialPoint {
  kind: "akar" | "ekstrem";
  x: number;
  y: number;
}

export interface DerivativeStep {
  title: string;
  math: string;
  description: string;
}

export interface FormulaAnalysis {
  source: string;
  normalized: string;
  pretty: string;
  derivativePretty: string;
  segments: MathSegment[];
  derivativeSegments: MathSegment[];
  extrema: Array<{ kind: "min" | "maks"; x: number; y: number }>;
  roots: SpecialPoint[];
  integral: number | null;
  integralText: string;
  steps: DerivativeStep[];
  explanation: string;
  rulesUsed: string[];
  variable: string;
  points: MathPoint[];
  derivativePoints: MathPoint[];
}

/* ---------- Latihan adaptif ---------- */
export interface ExerciseSessionStats {
  sessionId: string;
  topicId: TopicId;
  total: number;
  correct: number;
  xpEarned: number;
  difficulty: Difficulty;
}

export interface AnswerResult {
  questionId: QuestionId;
  correct: boolean;
  expectedAnswer: string;
  userAnswer: string;
  explanation: string;
  nextDifficulty: Difficulty;
  xpEarned: number;
  mastery: number;
}

export interface DashboardRecommendation {
  topicId: TopicId;
  title: string;
  reason: string;
  priority: number;
}

export interface StudentDashboardData {
  user: PublicUser;
  stats: {
    totalXp: number;
    core: number;
    streak: number;
    solvedTotal: number;
    avgMastery: number;
  };
  topics: Array<{
    topic: Topic;
    progress: Progress;
  }>;
  recent: HistoryRecord[];
  recommendation: DashboardRecommendation | null;
  kelasName?: string;
  classRank?: number;
}

export interface ClassWithStats extends Kelas {
  studentCount: number;
  avgMastery: number;
  activeCount: number;
}

export interface DosenDashboardData {
  user: PublicUser;
  stats: {
    classes: number;
    students: number;
    materials: number;
    avgMastery: number;
  };
  classes: ClassWithStats[];
  recent: HistoryRecord[];
}

export interface AdminMetrics {
  userCounts: Record<Role, number>;
  topicCount: number;
  questionCount: number;
  classCount: number;
  formulaCountToday: number;
  activeUsersToday: number;
  aiRequestsToday: number;
  avgXpToday: number;
}

export interface ActivityTrendPoint {
  label: string;
  requests: number;
  correct: number;
}

export interface AdminDashboardData {
  metrics: AdminMetrics;
  trend: ActivityTrendPoint[];
  logs: ActivityLog[];
}