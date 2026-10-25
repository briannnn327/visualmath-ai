/* =========================================================
   Skema validasi Zod v4 (Modul 3)
   - Validasi input form & request body sebelum masuk store
   ========================================================= */
import { z } from "zod";
import type { Difficulty, MaterialType, Role } from "@/lib/types";

export const roleSchema = z.enum(["mahasiswa", "dosen", "admin"]);
export const difficultySchema = z.enum(["mudah", "sedang", "sulit"]);
export const materialTypeSchema = z.enum(["materi", "soal"]);

const emailSchema = z.email("Format email tidak valid");

/** Panjang minimal kata sandi (dipakai skema & pesan UI). */
export const PASSWORD_MIN_LENGTH = 8;

const passwordField = z
  .string("Kata sandi wajib diisi")
  .min(PASSWORD_MIN_LENGTH, `Kata sandi minimal ${PASSWORD_MIN_LENGTH} karakter`)
  .max(128, "Kata sandi maksimal 128 karakter");

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string("Kata sandi wajib diisi").min(1, "Kata sandi wajib diisi").max(128),
});

export const registerSchema = z
  .object({
    name: z.string().trim().min(3, "Nama minimal 3 karakter").max(80, "Nama maksimal 80 karakter"),
    email: emailSchema,
    password: passwordField,
    confirmPassword: z.string(),
    role: roleSchema.default("mahasiswa"),
    nim: z.string().trim().max(20).optional(),
    prodi: z.string().trim().max(80).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.password !== data.confirmPassword) {
      ctx.addIssue({
        code: "custom",
        path: ["confirmPassword"],
        message: "Konfirmasi kata sandi tidak cocok",
      });
    }
  });

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    token: z.string().trim().min(16, "Token reset tidak valid"),
    password: passwordField,
    confirmPassword: z.string(),
  })
  .superRefine((data, ctx) => {
    if (data.password !== data.confirmPassword) {
      ctx.addIssue({
        code: "custom",
        path: ["confirmPassword"],
        message: "Konfirmasi kata sandi tidak cocok",
      });
    }
  });

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

/** Ekspresi matematika: hanya huruf, angka, spasi, operator & fungsi. */
const expressionSchema = z
  .string()
  .trim()
  .min(1, "Masukkan ekspresi fungsi terlebih dahulu")
  .max(120, "Ekspresi terlalu panjang")
  .regex(/^[0-9a-zA-Z+\-*/^().,\s]*$/, "Karakter yang diizinkan: angka, huruf, + - * / ^ ( )");

export const formulaInputSchema = z.object({
  expression: expressionSchema,
  variable: z.string().trim().max(1).default("x"),
  topicId: z
    .string()
    .optional()
    .nullable()
    .transform((v) => v || undefined),
  title: z.string().trim().max(100).optional().nullable(),
});

export type FormulaInput = z.infer<typeof formulaInputSchema>;

export const scanInputSchema = z.object({
  image: z
    .string()
    .min(32, "Gambar tidak valid")
    .max(8_000_000, "Ukuran gambar terlalu besar (maks sekitar 6 MB)")
    .refine((v) => v.startsWith("data:image/"), "Format gambar tidak didukung"),
});

export type ScanInput = z.infer<typeof scanInputSchema>;

export const exerciseAnswerSchema = z.object({
  questionId: z.string().min(1),
  topicId: z.string().min(1),
  sessionId: z.string().min(8).max(100),
  answer: z.string().trim().max(200),
  timeMs: z.number().int().nonnegative().max(3_600_000).optional(),
});

export const exerciseHelpSchema = z.object({
  questionId: z.string().min(1),
  topicId: z.string().min(1),
});

export type ExerciseHelpInput = z.infer<typeof exerciseHelpSchema>;

export const materialSchema = z.object({
  kelasId: z.string().min(1, "Pilih kelas terlebih dahulu"),
  topicId: z.string().min(1, "Pilih topik terlebih dahulu"),
  type: materialTypeSchema,
  title: z.string().trim().min(3, "Judul minimal 3 karakter").max(140),
  content: z.string().trim().min(10, "Konten terlalu pendek").max(5000),
  difficulty: difficultySchema.optional(),
});

export type MaterialInput = z.infer<typeof materialSchema>;

export const classInputSchema = z.object({
  kode: z.string().trim().min(2).max(20),
  nama: z.string().trim().min(3).max(80),
  dosenId: z.string().min(1),
});

export type ClassInput = z.infer<typeof classInputSchema>;

export const userAdminSchema = z.object({
  name: z.string().trim().min(3).max(80),
  email: emailSchema,
  role: roleSchema,
  password: z.string().min(PASSWORD_MIN_LENGTH).max(128).optional(),
  nim: z.string().trim().max(20).optional(),
  prodi: z.string().trim().max(80).optional(),
  kelasId: z.string().optional().nullable(),
});

export type UserAdminInput = z.infer<typeof userAdminSchema>;

export const questionTypeSchema = z.enum(["numeric", "choice", "truefalse"]);

export const topicAdminSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(2, "Slug minimal 2 karakter")
    .max(60)
    .regex(/^[a-z0-9-]+$/, "Slug hanya boleh huruf kecil, angka, dan tanda hubung"),
  title: z.string().trim().min(3, "Judul minimal 3 karakter").max(120),
  subtitle: z.string().trim().max(160).default(""),
  description: z.string().trim().max(1000).default(""),
  icon: z.string().trim().max(40).default("sparkle"),
  color: z.string().trim().max(40).default("#6750A4"),
  order: z.number().int().min(0).max(999).default(0),
});

export type TopicAdminInput = z.infer<typeof topicAdminSchema>;

export const questionAdminSchema = z.object({
  topicId: z.string().min(1, "Pilih topik terlebih dahulu"),
  difficulty: difficultySchema,
  type: questionTypeSchema,
  prompt: z.string().trim().min(3, "Soal minimal 3 karakter").max(2000),
  latex: z.string().trim().max(500).optional().nullable(),
  options: z.array(z.string().trim().min(1)).max(8).optional(),
  expectedAnswer: z.string().trim().min(1, "Jawaban benar wajib diisi").max(200),
  explanation: z.string().trim().min(3, "Pembahasan minimal 3 karakter").max(3000),
  hint: z.string().trim().max(500).optional().nullable(),
});

export type QuestionAdminInput = z.infer<typeof questionAdminSchema>;

export const joinClassSchema = z.object({
  kode: z.string().trim().min(2, "Kode kelas minimal 2 karakter").max(20),
});

export const profileSchema = z.object({
  name: z.string().trim().min(3).max(80),
  nim: z.string().trim().max(20).optional(),
  prodi: z.string().trim().max(80).optional(),
  password: z.string().min(PASSWORD_MIN_LENGTH).max(128).optional(),
});

export type ProfileInput = z.infer<typeof profileSchema>;

export const aiConfigSchema = z.object({
  provider: z.enum(["gemini", "groq"]),
  model: z.string().trim().min(1).max(60),
  temperature: z.number().min(0).max(2),
  maxTokens: z.number().int().min(100).max(8192),
  features: z.object({
    stepExplain: z.boolean(),
    adaptiveQuiz: z.boolean(),
    graphSimulation: z.boolean(),
  }),
  systemPrompt: z.string().trim().min(5).max(2000),
});

export type AIConfigInput = z.infer<typeof aiConfigSchema>;

export const deleteParamSchema = z.object({
  id: z.string().min(1),
});

/** Helper hasil parsing aman */
export function parseBody<T>(json: unknown, schema: z.ZodType<T>): T {
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Data tidak valid";
    throw new ApiValidationError(message);
  }
  return parsed.data;
}

export class ApiValidationError extends Error {}

/** Peta label bahasa Indonesia. */
export const roleLabel: Record<Role, string> = {
  mahasiswa: "Mahasiswa",
  dosen: "Dosen",
  admin: "Admin",
};

export const difficultyLabel: Record<Difficulty, string> = {
  mudah: "Mudah",
  sedang: "Sedang",
  sulit: "Sulit",
};

export const materialTypeLabel: Record<MaterialType, string> = {
  materi: "Materi",
  soal: "Soal",
};

export const difficultyPoint: Record<Difficulty, number> = {
  mudah: 5,
  sedang: 10,
  sulit: 20,
};
