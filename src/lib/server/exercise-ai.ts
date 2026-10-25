/* =========================================================
   Bantuan AI untuk latihan: petunjuk ("hint") & pembahasan
   ("explain") yang diperkaya konteks RAG materi kelas.
   Selalu punya fallback deterministik dari bank soal.
   ========================================================= */
import { exerciseHelp } from "@/lib/ai/llm";
import { buildReference, type RagCitation, searchMaterials, toCitations } from "@/lib/ai/rag";
import { getAIConfig } from "@/lib/db/store";
import type { Question } from "@/lib/types";

export interface ExerciseAIResult {
  text: string;
  keyPoints: string[];
  source: "ai" | "static";
  model?: string;
  references: RagCitation[];
}

const HINT_FALLBACK = "Pelajari kembali konsep & rumus pada topik ini, lalu terapkan bertahap.";

export async function helpForQuestion(
  question: Question,
  mode: "hint" | "explain",
  kelasIds?: string[],
): Promise<ExerciseAIResult> {
  const fallback = (mode === "hint" ? question.hint : question.explanation) || HINT_FALLBACK;

  try {
    const cfg = await getAIConfig();
    const query = [question.prompt, question.latex ?? ""].join(" ").trim();
    const chunks = await searchMaterials(query, {
      topicId: question.topicId,
      kelasIds,
      limit: 4,
    });
    const reference = chunks.length > 0 ? buildReference(chunks) : null;
    const ai = await exerciseHelp(
      {
        mode,
        prompt: question.prompt,
        latex: question.latex ?? null,
        type: question.type,
        expectedAnswer: question.expectedAnswer,
        explanation: question.explanation,
      },
      cfg,
      reference,
    );
    if (ai) {
      return {
        text: ai.text,
        keyPoints: ai.keyPoints,
        source: "ai",
        model: ai.model,
        references: toCitations(chunks),
      };
    }
  } catch (err) {
    console.warn(
      "[ai] bantuan latihan gagal; memakai fallback bank soal:",
      err instanceof Error ? err.message : err,
    );
  }

  return { text: fallback, keyPoints: [], source: "static", references: [] };
}
