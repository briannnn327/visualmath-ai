"use client";

import Link from "next/link";
import { type FormEvent, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Field, Input } from "@/components/ui/input";
import { Ring } from "@/components/ui/ring";
import { Skeleton, SkeletonCard } from "@/components/ui/skeleton";
import { useToastStore } from "@/components/ui/toast";
import {
  type CompleteExerciseResult,
  type ExerciseAIResult,
  type SafeQuestion,
  useCheckAnswer,
  useCompleteExercise,
  useExerciseExplain,
  useExerciseHint,
  useQuestion,
  useTopics,
} from "@/lib/hooks/queries";
import { difficultyLabel } from "@/lib/schemas";
import { useExerciseStore } from "@/lib/store/exerciseStore";
import type { AnswerResult, Difficulty } from "@/lib/types";
import { formatNumber, topicIcon } from "@/lib/utils";

const GOAL = 5;

/** Format detik menjadi mm:ss untuk timer sesi. */
function clock(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = Math.floor(totalSeconds % 60)
    .toString()
    .padStart(2, "0");
  return `${minutes}:${seconds}`;
}

const diffBadge: Record<Difficulty, "success" | "warning" | "error"> = {
  mudah: "success",
  sedang: "warning",
  sulit: "error",
};

interface Summary extends Omit<CompleteExerciseResult, "history" | "certificateId"> {
  topicId: string;
  reason: "selesai" | "quit";
  topicTitle: string;
}

export function LatihanClient({ initialTopicId }: { initialTopicId?: string }) {
  const topics = useTopics();
  const checkAnswer = useCheckAnswer();
  const complete = useCompleteExercise();
  const hintHelp = useExerciseHint();
  const explainHelp = useExerciseExplain();
  const pushToast = useToastStore((s) => s.push);

  const active = useExerciseStore((s) => s.active);
  const topicId = useExerciseStore((s) => s.topicId);
  const topicTitle = useExerciseStore((s) => s.topicTitle);
  const difficulty = useExerciseStore((s) => s.difficulty);
  const total = useExerciseStore((s) => s.total);
  const xp = useExerciseStore((s) => s.xp);
  const sessionId = useExerciseStore((s) => s.sessionId);
  const startedAt = useExerciseStore((s) => s.startedAt);
  const answeredQuestionIds = useExerciseStore((s) => s.answeredQuestionIds);
  const hydrated = useExerciseStore((s) => s.hydrated);

  const [elapsedSec, setElapsedSec] = useState(0);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [lastFeedback, setLastFeedback] = useState<{
    result: AnswerResult;
    mastery: number;
    questionId: string;
    /** Bekukan soal yang dijawab agar tidak berganti saat query berikutnya berjalan. */
    question: SafeQuestion;
  } | null>(null);
  const [answer, setAnswer] = useState("");
  const [choice, setChoice] = useState("");
  const [showHint, setShowHint] = useState(false);
  const [hint, setHint] = useState<ExerciseAIResult | null>(null);
  const [enriched, setEnriched] = useState<ExerciseAIResult | null>(null);
  const [preselect] = useState(initialTopicId);

  /* Rehidrasi sesi dari localStorage setelah mount (hindari mismatch SSR). */
  useEffect(() => {
    void (async () => {
      try {
        await useExerciseStore.persist.rehydrate();
      } finally {
        useExerciseStore.getState().markHydrated();
      }
    })();
  }, []);

  /* Timer sesi berjalan selama sesi aktif. */
  useEffect(() => {
    if (!active || !startedAt) return;
    const started = new Date(startedAt).getTime();
    const timer = window.setInterval(() => {
      setElapsedSec(Math.max(0, Math.floor((Date.now() - started) / 1000)));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [active, startedAt]);

  const exclude = answeredQuestionIds.join(",");
  const questionQuery = useQuestion(
    topicId,
    difficulty,
    active && hydrated,
    exclude,
    total,
    sessionId ?? "",
  );
  /* Saat feedback tampil, pakai soal yang dibekukan agar tidak tertukar dengan soal berikutnya. */
  const question = lastFeedback?.question ?? questionQuery.data?.question ?? null;

  function start(topicIdInput: string, title: string) {
    useExerciseStore.getState().start({ topicId: topicIdInput, topicTitle: title });
    setElapsedSec(0);
    setSummary(null);
    setLastFeedback(null);
    setAnswer("");
    setChoice("");
    setShowHint(false);
    setHint(null);
    setEnriched(null);
  }

  async function finish(
    reason: "selesai" | "quit",
    snapshot: {
      topicId: string | null;
      topicTitle: string;
      sessionId: string | null;
    },
  ) {
    if (!snapshot.topicId || !snapshot.sessionId) return;
    try {
      const result = await complete.mutateAsync({
        topicId: snapshot.topicId,
        sessionId: snapshot.sessionId,
        finishReason: reason,
      });
      setSummary({
        topicId: snapshot.topicId,
        topicTitle: snapshot.topicTitle,
        total: result.total,
        correct: result.correct,
        xp: result.xp,
        score: result.score,
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
    if (!sessionId) {
      pushToast("error", "Sesi latihan tidak valid. Mulai ulang latihan.");
      return;
    }
    const questionStartedAt = useExerciseStore.getState().questionStartedAt;
    const timeMs = questionStartedAt
      ? Math.min(3_600_000, Math.max(0, Date.now() - new Date(questionStartedAt).getTime()))
      : 0;
    try {
      const { result, mastery } = await checkAnswer.mutateAsync({
        questionId: question.id,
        // biome-ignore lint/style/noNonNullAssertion: halaman hanya diakses dari dalam topik.
        topicId: topicId!,
        sessionId,
        answer: userAnswer,
        timeMs,
      });
      /* Catat progres lokal segera setelah server menerima jawaban. */
      useExerciseStore.getState().record({
        questionId: question.id,
        correct: result.correct,
        xpEarned: result.xpEarned,
        nextDifficulty: result.nextDifficulty,
      });
      setLastFeedback({ result, mastery, questionId: question.id, question });
      setEnriched(null);
      // Perkaya pembahasan dengan konteks materi (RAG) di latar belakang.
      explainHelp
        .mutateAsync({
          questionId: question.id,
          // biome-ignore lint/style/noNonNullAssertion: halaman hanya diakses dari dalam topik.
          topicId: topicId!,
        })
        .then(({ help }) => setEnriched(help))
        .catch(() => {
          /* pakai pembahasan bank soal bila AI/RAG tidak tersedia */
        });
    } catch (err) {
      pushToast("error", err instanceof Error ? err.message : "Gagal memeriksa jawaban");
    }
  }

  async function loadHint() {
    if (showHint) {
      setShowHint(false);
      return;
    }
    setShowHint(true);
    if (hint || !question || !topicId) return;
    try {
      const { help } = await hintHelp.mutateAsync({ questionId: question.id, topicId });
      setHint(help);
    } catch {
      /* biarkan fallback bank soal tampil */
    }
  }

  async function handleNext() {
    if (!lastFeedback) return;
    const snapshot = useExerciseStore.getState();
    const willFinish = snapshot.total >= GOAL;
    setLastFeedback(null);
    setAnswer("");
    setChoice("");
    setShowHint(false);
    setHint(null);
    setEnriched(null);
    if (willFinish) await finish("selesai", snapshot);
  }

  async function handleQuit() {
    const snapshot = useExerciseStore.getState();
    await finish("quit", snapshot);
  }

  if (!hydrated) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <SkeletonCard />
      </div>
    );
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
              sublabel={
                pct >= 70 ? "Selesai!" : summary.reason === "quit" ? "Dihentikan" : "Coba lagi"
              }
              color="var(--color-primary)"
            />
            <div>
              <h2 className="font-display text-2xl font-extrabold text-on-surface">
                {pct >= 70
                  ? "Kerja bagus!"
                  : summary.reason === "quit"
                    ? "Sesi dihentikan"
                    : "Terus berlatih!"}
              </h2>
              <p className="mt-1 text-sm text-on-surface-variant">{summary.topicTitle}</p>
            </div>
            <dl className="grid w-full grid-cols-3 gap-3">
              {[
                ["Benar", `${summary.correct}/${summary.total}`],
                ["XP", `+${formatNumber(summary.xp)}`],
                ["Skor", `${summary.score}`],
              ].map(([k, v]) => (
                <div
                  key={k}
                  className="rounded-2xl border border-outline-variant bg-surface-container/60 p-3"
                >
                  <dt className="text-[11px] font-bold uppercase tracking-wide text-on-surface-variant">
                    {k}
                  </dt>
                  <dd className="font-display text-lg font-extrabold tabular text-on-surface">
                    {v}
                  </dd>
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
                    <p className="mt-0.5 line-clamp-2 text-sm text-on-surface-variant">
                      {t.description}
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between gap-2">
                  <div className="flex gap-1.5">
                    {(Object.keys(t.counts) as Difficulty[]).map((d) =>
                      t.counts[d] > 0 ? (
                        <Badge key={d} variant={diffBadge[d]}>
                          {difficultyLabel[d]}: {t.counts[d]}
                        </Badge>
                      ) : null,
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
          <p className="text-sm text-on-surface-variant">
            Soal {Math.min(lastFeedback ? total : total + 1, GOAL)} dari {GOAL}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={diffBadge[difficulty]}>
            <Icon name="target" size={12} />
            {difficultyLabel[difficulty]}
          </Badge>
          <Badge variant="primary">
            <Icon name="star" size={12} />+{formatNumber(xp)} XP
          </Badge>
          <Badge variant="neutral" className="tabular">
            <Icon name="clock" size={12} />
            {clock(elapsedSec)}
          </Badge>
          <Button variant="ghost" size="sm" onClick={handleQuit} loading={complete.isPending}>
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
                {question.latex && <p className="mb-2 font-mono text-primary">{question.latex}</p>}
                <h3 className="text-lg font-semibold leading-relaxed text-on-surface">
                  {question.prompt}
                </h3>
              </div>

              {question.type === "numeric" ? (
                <form onSubmit={submitAnswer} className="space-y-3">
                  <Field
                    label="Jawaban numerik"
                    hint="Gunakan titik (.) untuk desimal. Contoh: 6.4031"
                  >
                    <div className="flex max-w-xs gap-2">
                      <Input
                        value={answer}
                        onChange={(e) => setAnswer(e.target.value)}
                        placeholder="Jawaban…"
                        className="math-mono"
                        inputMode="decimal"
                        autoFocus
                        disabled={!!lastFeedback}
                      />
                      <Button
                        type="submit"
                        loading={checkAnswer.isPending}
                        disabled={!!lastFeedback}
                        icon="check"
                      >
                        Kirim
                      </Button>
                    </div>
                  </Field>
                  <button
                    type="button"
                    onClick={loadHint}
                    className="flex items-center gap-1.5 text-sm font-semibold text-primary"
                  >
                    <Icon name="lightbulb" size={15} />
                    {showHint ? "Sembunyikan petunjuk" : "Lihat petunjuk"}
                  </button>
                  {showHint && (
                    <p className="rounded-xl bg-info-container px-4 py-3 text-sm text-on-info-container">
                      💡{" "}
                      {hintHelp.isPending
                        ? "Menyusun petunjuk…"
                        : (hint?.text ??
                          question.hint ??
                          "Pelajari kembali konsep pada topik ini.")}
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
                    <Button
                      type="submit"
                      loading={checkAnswer.isPending}
                      disabled={!choice || !!lastFeedback}
                      icon="check"
                    >
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
        <Card
          className={
            lastFeedback.result.correct
              ? "border-success/50 bg-success-container/40"
              : "border-error/50 bg-error-container/40"
          }
        >
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
                    Jawaban yang benar:{" "}
                    <span className="math-mono font-semibold text-on-surface">
                      {lastFeedback.result.expectedAnswer}
                    </span>
                  </p>
                )}
                <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">
                  {enriched?.text ?? lastFeedback.result.explanation}
                </p>
                {enriched?.source === "ai" && (
                  <Badge variant="primary" className="mt-2">
                    <Icon name="sparkle" size={12} />
                    Dibantu AI{enriched.model ? ` · ${enriched.model}` : ""}
                  </Badge>
                )}
                {enriched?.keyPoints && enriched.keyPoints.length > 0 && (
                  <ul className="mt-2 list-disc space-y-0.5 ps-5 text-sm text-on-surface-variant">
                    {enriched.keyPoints.map((k) => (
                      <li key={k}>{k}</li>
                    ))}
                  </ul>
                )}
                {enriched?.references && enriched.references.length > 0 && (
                  <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-on-surface-variant">
                    <span>Sumber materi:</span>
                    {enriched.references.map((r) => (
                      <Link
                        key={r.id}
                        href={`/materi/${r.materialId}`}
                        className="font-semibold text-primary hover:underline"
                      >
                        {r.title}
                      </Link>
                    ))}
                  </div>
                )}

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Badge variant={lastFeedback.result.xpEarned > 0 ? "success" : "neutral"}>
                    <Icon name="star" size={12} />
                    {lastFeedback.result.xpEarned > 0
                      ? `+${lastFeedback.result.xpEarned} XP`
                      : "Tanpa XP"}
                  </Badge>
                  <Badge variant="info">Mastery: {lastFeedback.mastery}%</Badge>
                  <Badge variant="warning">
                    Berikutnya: {difficultyLabel[lastFeedback.result.nextDifficulty]}
                  </Badge>
                  <Button
                    className="ms-auto"
                    icon="arrow-right"
                    onClick={handleNext}
                    loading={complete.isPending}
                  >
                    {total >= GOAL ? "Selesaikan" : "Soal Berikutnya"}
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
