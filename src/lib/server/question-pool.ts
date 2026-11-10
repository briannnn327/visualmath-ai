import type { Difficulty } from "@/lib/types";

export interface PoolQuestion {
  id: string;
  topicId: string;
  difficulty: Difficulty;
}

/**
 * Kandidat soal untuk satu langkah sesi latihan.
 *
 * Urutan prioritas:
 * 1. Soal belum dijawab pada level saat ini.
 * 2. Soal belum dijawab lain di topik yang sama (agar sesi 15 soal tetap unik
 *    ketika satu level hanya punya 5 soal).
 * 3. Soal pada level saat ini (boleh berulang bila seluruh topik sudah habis).
 * 4. Seluruh soal topik (jaring pengaman terakhir).
 */
export function questionCandidates<T extends PoolQuestion>(
  questions: T[],
  options: {
    topicId?: string | null;
    difficulty: Difficulty;
    excluded: Set<string>;
  },
): T[] {
  const { topicId, difficulty, excluded } = options;

  const topicPool = questions.filter((q) => !topicId || q.topicId === topicId);
  if (topicPool.length === 0) return [];

  const levelPool = topicPool.filter((q) => q.difficulty === difficulty);
  const unseenLevel = levelPool.filter((q) => !excluded.has(q.id));
  if (unseenLevel.length > 0) return unseenLevel;

  const unseenTopic = topicPool.filter((q) => !excluded.has(q.id));
  if (unseenTopic.length > 0) return unseenTopic;

  return levelPool.length > 0 ? levelPool : topicPool;
}
