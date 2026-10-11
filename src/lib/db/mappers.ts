/* =========================================================
   Mapper baris Prisma -> tipe domain (src/lib/types.ts).
   - Date  -> string ISO
   - null  -> undefined
   ========================================================= */
import type {
  ActivityKind,
  ActivityLog,
  AIConfig,
  Difficulty,
  FormulaRecord,
  HistoryRecord,
  Kelas,
  KelasId,
  MaterialItem,
  MaterialType,
  Progress,
  Question,
  QuestionType,
  Role,
  Topic,
  User,
  UserId,
} from "@/lib/types";

type Nullable<T> = T | null;

export function mapUser(u: {
  id: string;
  name: string;
  email: string;
  password: string;
  role: Role;
  nim: Nullable<string>;
  prodi: Nullable<string>;
  kelasId: Nullable<string>;
  color: string;
  createdAt: Date;
}): User {
  return {
    id: u.id as UserId,
    name: u.name,
    email: u.email,
    password: u.password,
    role: u.role,
    nim: u.nim ?? undefined,
    prodi: u.prodi ?? undefined,
    kelasId: (u.kelasId as KelasId | null) ?? undefined,
    color: u.color,
    createdAt: u.createdAt.toISOString(),
  };
}

export function mapKelas(k: {
  id: string;
  kode: string;
  nama: string;
  dosenId: string;
  createdAt: Date;
  mahasiswa: Array<{ id: string }>;
}): Kelas {
  return {
    id: k.id as KelasId,
    kode: k.kode,
    nama: k.nama,
    dosenId: k.dosenId as UserId,
    mahasiswaIds: k.mahasiswa.map((m) => m.id as UserId),
    createdAt: k.createdAt.toISOString(),
  };
}

export function mapTopic(t: {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  icon: string;
  color: string;
  formulaCount: number;
  questionCount: number;
  order: number;
}): Topic {
  return {
    id: t.id as Topic["id"],
    slug: t.slug,
    title: t.title,
    subtitle: t.subtitle,
    description: t.description,
    icon: t.icon,
    color: t.color,
    formulaCount: t.formulaCount,
    questionCount: t.questionCount,
    order: t.order,
  };
}

export function mapQuestion(q: {
  id: string;
  topicId: string;
  difficulty: Difficulty;
  type: QuestionType;
  prompt: string;
  latex: Nullable<string>;
  options: string[];
  expectedAnswer: string;
  explanation: string;
  hint: Nullable<string>;
}): Question {
  return {
    id: q.id as Question["id"],
    topicId: q.topicId as Question["topicId"],
    difficulty: q.difficulty,
    type: q.type,
    prompt: q.prompt,
    latex: q.latex ?? undefined,
    options: q.options.length > 0 ? q.options : undefined,
    expectedAnswer: q.expectedAnswer,
    explanation: q.explanation,
    hint: q.hint ?? undefined,
  };
}

export function mapProgress(p: {
  userId: string;
  topicId: string;
  mastery: number;
  attempts: number;
  solved: number;
  xp: number;
  updatedAt: Date;
}): Progress {
  return {
    userId: p.userId as UserId,
    topicId: p.topicId as Progress["topicId"],
    mastery: p.mastery,
    attempts: p.attempts,
    solved: p.solved,
    xp: p.xp,
    updatedAt: p.updatedAt.toISOString(),
  };
}

export function mapHistory(h: {
  id: string;
  userId: string;
  kind: ActivityKind;
  title: string;
  summary: string;
  score: Nullable<number>;
  xp: Nullable<number>;
  createdAt: Date;
}): HistoryRecord {
  return {
    id: h.id as HistoryRecord["id"],
    userId: h.userId as UserId,
    kind: h.kind,
    title: h.title,
    summary: h.summary,
    score: h.score ?? undefined,
    xp: h.xp ?? undefined,
    createdAt: h.createdAt.toISOString(),
  };
}

export function mapLog(l: {
  id: string;
  userId: Nullable<string>;
  actorName: string;
  action: string;
  target: string;
  severity: ActivityLog["severity"];
  createdAt: Date;
}): ActivityLog {
  return {
    id: l.id as ActivityLog["id"],
    userId: (l.userId as UserId | null) ?? undefined,
    actorName: l.actorName,
    action: l.action,
    target: l.target,
    severity: l.severity,
    createdAt: l.createdAt.toISOString(),
  };
}

export function mapAIConfig(c: {
  id: string;
  model: string;
  temperature: number;
  maxTokens: number;
  stepExplain: boolean;
  adaptiveQuiz: boolean;
  graphSimulation: boolean;
  systemPrompt: string;
  updatedAt: Date;
}): AIConfig {
  return {
    id: c.id as AIConfig["id"],
    model: c.model,
    temperature: c.temperature,
    maxTokens: c.maxTokens,
    features: {
      stepExplain: c.stepExplain,
      adaptiveQuiz: c.adaptiveQuiz,
      graphSimulation: c.graphSimulation,
    },
    systemPrompt: c.systemPrompt,
    updatedAt: c.updatedAt.toISOString(),
  };
}

export function mapMaterial(m: {
  id: string;
  kelasId: string;
  topicId: string;
  type: MaterialType;
  title: string;
  content: string;
  difficulty: Nullable<Difficulty>;
  createdBy: string;
  updatedAt: Date;
}): MaterialItem {
  return {
    id: m.id as MaterialItem["id"],
    kelasId: m.kelasId as MaterialItem["kelasId"],
    topicId: m.topicId as MaterialItem["topicId"],
    type: m.type,
    title: m.title,
    content: m.content,
    difficulty: m.difficulty ?? undefined,
    createdBy: m.createdBy as UserId,
    updatedAt: m.updatedAt.toISOString(),
  };
}

export function mapFormula(f: {
  id: string;
  userId: string;
  expression: string;
  display: string;
  topicId: Nullable<string>;
  createdAt: Date;
}): FormulaRecord {
  return {
    id: f.id as FormulaRecord["id"],
    userId: f.userId as UserId,
    expression: f.expression,
    display: f.display,
    topicId: (f.topicId as FormulaRecord["topicId"] | null) ?? undefined,
    createdAt: f.createdAt.toISOString(),
  };
}
