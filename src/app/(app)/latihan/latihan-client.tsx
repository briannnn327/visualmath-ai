"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Field } from "@/components/ui/input";
import { Skeleton, SkeletonCard } from "@/components/ui/skeleton";
import { Icon } from "@/components/ui/icon";
import { Ring } from "@/components/ui/ring";
import { useTopics, useQuestion, useCheckAnswer, useCompleteExercise } from "@/lib/hooks/queries";
import { useExerciseStore } from "@/lib/store/exerciseStore";
import { useToastStore } from "@/components/ui/toast";
import { topicIcon, formatNumber } from "@/lib/utils";
import { difficultyLabel } from "@/lib/schemas";
import type { AnswerResult, Difficulty } from "@/lib/types";

const GOAL = 5;

const diffBadge: Record<Difficulty, "success" | "warning" | "error"> = {
  mudah: "success",
  sedang: "warning",
  sulit: "error",
};

interface Summary {
  topicId: string;
  total: number;
  correct: number;
  xp: number;
  score: number;
  reason: "selesai" | "quit";
  topicTitle: string;
}

export function LatihanClient({ initialTopicId }: { initialTopicId?: string }) {
  const topics = useTopics();
  const checkAnswer = useCheckAnswer();
  const complete = useCompleteExercise();
  const pushToast = useToastStore((s) => s.push);

  const active = useExerciseStore((s) => s.active);
  const topicId = useExerciseStore((s) => s.topicId);
  const topicTitle = useExerciseStore((s) => s.topicTitle);
  const difficulty = useExerciseStore((s) => s.difficulty);
  const total = useExerciseStore((s) => s.total);
  const xp = useExerciseStore((s) => s.xp);

  const [summary, setSummary] = useState<Summary | null>(null);
  const [lastFeedback, setLastFeedback] = useState<{ result: AnswerResult; mastery: number } | null>(null);
  const [answer, setAnswer] = useState("");
  const [choice, setChoice] = useState("");
  const [showHint, setShowHint] = useState(false);
  const [preselect] = useState(initialTopicId);

  const questionQuery = useQuestion(topicId, difficulty, active);
  const question = questionQuery.data?.question ?? null;

  function start(topicIdInput: string, title: string) {
    useExerciseStore.getState().start({ topicId: topicIdInput, topicTitle: title });
    setSummary(null);
    setLastFeedback(null);
    setAnswer("");
    setChoice("");
  }

  async function finish(reason: "selesai" | "quit", snapshot: { topicId: string | null; topicTitle: string; total: number; correct: number; xp: number }) {
    if (!snapshot.topicId) return;
    try {
      const { score } = await complete.mutateAsync({
        topicId: snapshot.topicId,
        total: snapshot.total,
        correct: snapshot.correct,
        xp: snapshot.xp,
        finishReason: reason,
      });
      setSummary({
        topicId: snapshot.topicId,
        topicTitle: snapshot.topicTitle,
        total: snapshot.total,
        correct: snapshot.correct,
        xp: snapshot.xp,
        score,
        reason,
      });
      useExerciseStore.getState().reset();
    } catch (err) {
      pushToast("error", err instanceof Error ? err.message : "Gagal menyimpan sesi");
    }
  }

  async function submitAnswer(e: FormEvent) {
    e.preventDefault();
    if (!question) return;
    const userAnswer = question.type === "numeric" ? answer : choice;
    if (!userAnswer.trim()) {
      pushToast("warning", "Jawaban masih kosong");
      return;
    }
    try {
      const { result, mastery } = await checkAnswer.mutateAsync({
        questionId: question.id,
        topicId: topicId!,
        answer: userAnswer,
        timeMs: 0,
      });
      setLastFeedback({ result, mastery });
    } catch (err) {
      pushToast("error", err instanceof Error ? err.message : "Gagal memeriksa jawaban");
    }
  }

  async function handleNext() {
    if (!lastFeedback) return;
    const willFinish = useExerciseStore.getState().total + 1 >= GOAL;
    useExerciseStore.getState().record(
      lastFeedback.result.correct,
      lastFeedback.result.xpEarned,
      lastFeedback.result.nextDifficulty
    );
    const snapshot = useExerciseStore.getState();
    setLastFeedback(null);
    setAnswer("");
    setChoice("");
    setShowHint(false);
    if (willFinish) await finish("selesai", snapshot);
  }

  async function handleQuit() {
    const snapshot = useExerciseStore.getState();
    await finish("quit", snapshot);
  }

  /* ================= VIEW HASIL ================= */
  if (summary) {
    const pct = Math.round((summary.correct / Math.max(1, summary.total)) * 100);
    return (
      <div className="mx-auto max-w-lg space-y-6">
        <Card>
          <CardContent className="flex flex-col items-center gap-5 p-8 text-center">
            <Ring
              value={pct}
              size={140}
              label={`${pct}%`}
              sublabel={pct >= 70 ? "Selesai!" : summary.reason === "quit" ? "Dihentikan" : "Coba lagi"}
              color="var(--color-primary)"
            />
            <div>
              <h2 className="font-display text-2xl font-extrabold text-on-surface">
                {pct >= 70 ? "Kerja bagus!" : summary.reason === "quit" ? "Sesi dihentikan" : "Terus berlatih!"}
              </h2>
              <p className="mt-1 text-sm text-on-surface-variant">{summary.topicTitle}</p>
            </div>
            <dl className="grid w-full grid-cols-3 gap-3">
              {[
                ["Benar", `${summary.correct}/${summary.total}`],
                ["XP", `+${formatNumber(summary.xp)}`],
                ["Skor", `${summary.score}`],
              ].map(([k, v]) => (
                <div key={k} className="rounded-2xl border border-outline-variant bg-surface-container/60 p-3">
                  <dt className="text-[11px] font-bold uppercase tracking-wide text-on-surface-variant">{k}</dt>
                  <dd className="font-display text-lg font-extrabold tabular text-on-surface">{v}</dd>
                </div>
              ))}
            </dl>
            <div className="flex flex-wrap justify-center gap-2">
              <Button
                onClick={() => {
                  if (summary.topicId) start(summary.topicId, summary.topicTitle);
                }}
                icon="refresh"
              >
                Latihan Lagi
              </Button>
              <Link href="/dashboard">
                <Button variant="outline">Ke Beranda</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  /* ================= VIEW PILIH TOPIK ================= */
  if (!active) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="font-display text-2xl font-extrabold text-on-surface">Latihan Adaptif</h2>
          <p className="mt-1 text-sm text-on-surface-variant">
            Pilih topik untuk memulai. Kesulitan akan menyesuaikan jawabanmu — {GOAL} soal per sesi.
          </p>
        </div>

        {topics.isPending && <SkeletonCard />}
        {topics.isError && (
          <Card>
            <CardContent className="p-5 text-sm text-error">{topics.error.message}</CardContent>
          </Card>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          {(topics.data ?? []).map((t) => (
            <Card
              key={t.id}
              className={
                preselect === t.id || preselect === t.slug
                  ? "border-primary/60 ring-2 ring-primary/20"
                  : "transition-colors hover:border-primary/40"
              }
            >
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary-container text-on-primary-container">
                    <Icon name={topicIcon(t.icon)} size={20} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-display font-bold text-on-surface">{t.title}</h3>
                    <p className="mt-0.5 line-clamp-2 text-sm text-on-surface-variant">{t.description}</p>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between gap-2">
                  <div className="flex gap-1.5">
                    {(Object.keys(t.counts) as Difficulty[]).map((d) =>
                      t.counts[d] > 0 ? (
                        <Badge key={d} variant={diffBadge[d]}>
                          {difficultyLabel[d]}: {t.counts[d]}
                        </Badge>
                      ) : null
                    )}
                  </div>
                  <Button size="sm" icon="play" onClick={() => start(t.id, t.title)}>
                    Mulai
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  /* ================= VIEW SOAL ================= */
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-extrabold text-on-surface">{topicTitle}</h2>
          <p className="text-sm text-on-surface-variant">Soal {Math.min(total + 1, GOAL)} dari {GOAL}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={diffBadge[difficulty]}>
            <Icon name="target" size={12} />
            {difficultyLabel[difficulty]}
          </Badge>
          <Badge variant="primary">
            <Icon name="star" size={12} />
            +{formatNumber(xp)} XP
          </Badge>
          <Button variant="ghost" size="sm" onClick={handleQuit}>
            Hentikan
          </Button>
        </div>
      </div>

      <div className="flex gap-1.5">
        {Array.from({ length: GOAL }, (_, i) => (
          <span
            key={i}
            className={
              i < total
                ? "h-1.5 flex-1 rounded-full bg-success"
                : i === total
                  ? "h-1.5 flex-1 rounded-full bg-primary"
                  : "h-1.5 flex-1 rounded-full bg-surface-container-high"
            }
          />
        ))}
      </div>

      <Card>
        <CardContent className="space-y-5 p-6" key={questionQuery.data ? "ready" : "loading"}>
          {questionQuery.isFetching && !question && <Skeleton className="h-6 w-3/4" />}

          {question && (
            <>
              <div>
                {question.latex && (
                  <p className="mb-2 font-mono text-primary">{question.latex}</p>
                )}
                <h3 className="text-lg font-semibold leading-relaxed text-on-surface">{question.prompt}</h3>
              </div>

              {question.type === "numeric" ? (
                <form onSubmit={submitAnswer} className="space-y-3">
                  <Field label="Jawaban numerik" hint="Gunakan titik (.) untuk desimal. Contoh: 6.4031">
                    <div className="flex max-w-xs gap-2">
                      <Input
                        value={answer}
                        onChange={(e) => setAnswer(e.target.value)}
                        placeholder="Jawaban…"
                        className="math-mono"
                        inputMode="decimal"
                        autoFocus
                      />
                      <Button type="submit" loading={checkAnswer.isPending} icon="check">
                        Kirim
                      </Button>
                    </div>
                  </Field>
                  {question.hint && (
                    <button
                      type="button"
                      onClick={() => setShowHint((v) => !v)}
                      className="flex items-center gap-1.5 text-sm font-semibold text-primary"
                    >
                      <Icon name="lightbulb" size={15} />
                      {showHint ? "Sembunyikan petunjuk" : "Lihat petunjuk"}
                    </button>
                  )}
                  {showHint && question.hint && (
                    <p className="rounded-xl bg-info-container px-4 py-3 text-sm text-on-info-container">
                      💡 {question.hint}
                    </p>
                  )}
                </form>
              ) : (
                <form onSubmit={submitAnswer} className="space-y-2">
                  {question.options?.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setChoice(opt)}
                      disabled={!!lastFeedback}
                      className={
                        choice === opt
                          ? "flex w-full items-center gap-3 rounded-2xl border-2 border-primary bg-primary-lighter px-4 py-3 text-left"
                          : "flex w-full items-center gap-3 rounded-2xl border border-outline-variant px-4 py-3 text-left transition-colors hover:border-primary/40 hover:bg-surface-container"
                      }
                    >
                      <span
                        className={
                          choice === opt
                            ? "grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary text-on-primary"
                            : "grid h-5 w-5 shrink-0 place-items-center rounded-full border border-outline text-on-surface-variant"
                        }
                      >
                        {choice === opt && <Icon name="check" size={12} />}
                      </span>
                      <span className="text-sm font-medium text-on-surface">{opt}</span>
                    </button>
                  ))}
                  <div className="flex justify-end pt-1">
                    <Button type="submit" loading={checkAnswer.isPending} disabled={!choice} icon="check">
                      Kunci Jawaban
                    </Button>
                  </div>
                </form>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {lastFeedback && (
        <Card className={lastFeedback.result.correct ? "border-success/50 bg-success-container/40" : "border-error/50 bg-error-container/40"}>
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              <span
                className={
                  lastFeedback.result.correct
                    ? "grid h-10 w-10 shrink-0 place-items-center rounded-full bg-success text-white"
                    : "grid h-10 w-10 shrink-0 place-items-center rounded-full bg-error text-white"
                }
              >
                <Icon name={lastFeedback.result.correct ? "check" : "x"} size={20} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-display text-lg font-bold text-on-surface">
                  {lastFeedback.result.correct ? "Jawaban benar! 🎉" : "Belum tepat"}
                </p>
                {!lastFeedback.result.correct && (
                  <p className="mt-0.5 text-sm text-on-surface-variant">
                    Jawaban yang benar: <span className="math-mono font-semibold text-on-surface">{lastFeedback.result.expectedAnswer}</span>
                  </p>
                )}
                <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">{lastFeedback.result.explanation}</p>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Badge variant={lastFeedback.result.xpEarned > 0 ? "success" : "neutral"}>
                    <Icon name="star" size={12} />
                    {lastFeedback.result.xpEarned > 0 ? `+${lastFeedback.result.xpEarned} XP` : "Tanpa XP"}
                  </Badge>
                  <Badge variant="info">Mastery: {lastFeedback.mastery}%</Badge>
                  <Badge variant="warning">Berikutnya: {difficultyLabel[lastFeedback.result.nextDifficulty]}</Badge>
                  <Button className="ms-auto" icon="arrow-right" onClick={handleNext} loading={complete.isPending}>
                    {total + 1 >= GOAL ? "Selesaikan" : "Soal Berikutnya"}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}