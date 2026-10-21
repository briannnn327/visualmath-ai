"use client";

import { type FormEvent, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Field, Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { SkeletonCard } from "@/components/ui/skeleton";
import { useToastStore } from "@/components/ui/toast";
import type { TopicWithCounts } from "@/lib/hooks/queries";
import {
  useAdminQuestions,
  useCreateQuestion,
  useCreateTopic,
  useDeleteQuestion,
  useDeleteTopic,
  useTopics,
  useUpdateQuestion,
  useUpdateTopic,
} from "@/lib/hooks/queries";
import type { QuestionAdminInput, TopicAdminInput } from "@/lib/schemas";
import type { Difficulty, Question, QuestionType } from "@/lib/types";
import { topicIcon } from "@/lib/utils";

const ICON_OPTIONS = [
  "sparkle",
  "route",
  "infinity",
  "gradient",
  "chart",
  "orbit",
  "calculate",
  "functions",
];
const COLOR_OPTIONS = ["#6750A4", "#0061A4", "#006E1C", "#984061", "#7A5900", "#3F5F90"];

const EMPTY_TOPIC = {
  slug: "",
  title: "",
  subtitle: "",
  description: "",
  icon: "sparkle",
  color: "#6750A4",
  order: 0,
};

type TopicForm = typeof EMPTY_TOPIC;

interface QuestionForm {
  topicId: string;
  difficulty: Difficulty;
  type: QuestionType;
  prompt: string;
  latex: string;
  options: string;
  expectedAnswer: string;
  explanation: string;
  hint: string;
}

const EMPTY_QUESTION: QuestionForm = {
  topicId: "",
  difficulty: "sedang",
  type: "numeric",
  prompt: "",
  latex: "",
  options: "",
  expectedAnswer: "",
  explanation: "",
  hint: "",
};

const DIFFICULTIES: Difficulty[] = ["mudah", "sedang", "sulit"];
const TYPES: Array<{ value: QuestionType; label: string }> = [
  { value: "numeric", label: "Isian angka" },
  { value: "choice", label: "Pilihan ganda" },
  { value: "truefalse", label: "Benar/Salah" },
];

export default function AdminTopikPage() {
  const pushToast = useToastStore((s) => s.push);
  const { data: topics, isLoading, isError, error, refetch } = useTopics();
  const createTopic = useCreateTopic();
  const updateTopic = useUpdateTopic();
  const deleteTopic = useDeleteTopic();

  const [selectedTopicId, setSelectedTopicId] = useState<string>("");
  const questionsQuery = useAdminQuestions(selectedTopicId || null);
  const createQuestion = useCreateQuestion();
  const updateQuestion = useUpdateQuestion();
  const deleteQuestion = useDeleteQuestion();

  const [topicModal, setTopicModal] = useState(false);
  const [editingTopic, setEditingTopic] = useState<TopicWithCounts | null>(null);
  const [topicForm, setTopicForm] = useState<TopicForm>(EMPTY_TOPIC);
  const [savingTopic, setSavingTopic] = useState(false);

  const [questionModal, setQuestionModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [questionForm, setQuestionForm] = useState<QuestionForm>(EMPTY_QUESTION);
  const [savingQuestion, setSavingQuestion] = useState(false);

  const topicList = useMemo(() => topics ?? [], [topics]);
  const selectedTopic = topicList.find((t) => t.id === selectedTopicId) ?? null;

  function openCreateTopic() {
    setEditingTopic(null);
    setTopicForm({ ...EMPTY_TOPIC, order: topicList.length });
    setTopicModal(true);
  }

  function openEditTopic(t: TopicWithCounts) {
    setEditingTopic(t);
    setTopicForm({
      slug: t.slug,
      title: t.title,
      subtitle: t.subtitle,
      description: t.description,
      icon: t.icon,
      color: t.color,
      order: t.order,
    });
    setTopicModal(true);
  }

  async function submitTopic(e: FormEvent) {
    e.preventDefault();
    setSavingTopic(true);
    try {
      const payload: TopicAdminInput = {
        slug: topicForm.slug.trim().toLowerCase(),
        title: topicForm.title.trim(),
        subtitle: topicForm.subtitle.trim(),
        description: topicForm.description.trim(),
        icon: topicForm.icon,
        color: topicForm.color,
        order: Number(topicForm.order) || 0,
      };
      if (editingTopic) {
        await updateTopic.mutateAsync({ id: editingTopic.id, ...payload });
        pushToast("success", "Topik diperbarui.");
      } else {
        await createTopic.mutateAsync(payload);
        pushToast("success", "Topik dibuat.");
      }
      setTopicModal(false);
    } catch (err) {
      pushToast("error", err instanceof Error ? err.message : "Gagal menyimpan topik.");
    } finally {
      setSavingTopic(false);
    }
  }

  async function removeTopic(t: TopicWithCounts) {
    if (
      !window.confirm(
        `Hapus topik "${t.title}" beserta ${t.questionCount} soalnya? Tindakan ini permanen.`,
      )
    )
      return;
    try {
      await deleteTopic.mutateAsync(t.id);
      if (selectedTopicId === t.id) setSelectedTopicId("");
      pushToast("success", "Topik dihapus.");
    } catch (err) {
      pushToast("error", err instanceof Error ? err.message : "Gagal menghapus topik.");
    }
  }

  function openCreateQuestion() {
    if (!selectedTopicId) {
      pushToast("warning", "Pilih topik terlebih dahulu.");
      return;
    }
    setEditingQuestion(null);
    setQuestionForm({ ...EMPTY_QUESTION, topicId: selectedTopicId });
    setQuestionModal(true);
  }

  function openEditQuestion(q: Question) {
    setEditingQuestion(q);
    setQuestionForm({
      topicId: q.topicId,
      difficulty: q.difficulty,
      type: q.type,
      prompt: q.prompt,
      latex: q.latex ?? "",
      options: (q.options ?? []).join("\n"),
      expectedAnswer: q.expectedAnswer,
      explanation: q.explanation,
      hint: q.hint ?? "",
    });
    setQuestionModal(true);
  }

  async function submitQuestion(e: FormEvent) {
    e.preventDefault();
    setSavingQuestion(true);
    try {
      const options =
        questionForm.type === "choice"
          ? questionForm.options
              .split("\n")
              .map((o) => o.trim())
              .filter(Boolean)
          : [];
      if (questionForm.type === "choice" && options.length < 2) {
        pushToast("warning", "Soal pilihan ganda butuh minimal 2 opsi.");
        setSavingQuestion(false);
        return;
      }
      const payload: QuestionAdminInput = {
        topicId: questionForm.topicId,
        difficulty: questionForm.difficulty,
        type: questionForm.type,
        prompt: questionForm.prompt.trim(),
        latex: questionForm.latex.trim() || null,
        options,
        expectedAnswer: questionForm.expectedAnswer.trim(),
        explanation: questionForm.explanation.trim(),
        hint: questionForm.hint.trim() || null,
      };
      if (editingQuestion) {
        await updateQuestion.mutateAsync({ id: editingQuestion.id, ...payload });
        pushToast("success", "Soal diperbarui.");
      } else {
        await createQuestion.mutateAsync(payload);
        pushToast("success", "Soal dibuat.");
      }
      setQuestionModal(false);
    } catch (err) {
      pushToast("error", err instanceof Error ? err.message : "Gagal menyimpan soal.");
    } finally {
      setSavingQuestion(false);
    }
  }

  async function removeQuestion(q: Question) {
    if (!window.confirm("Hapus soal ini? Tindakan ini permanen.")) return;
    try {
      await deleteQuestion.mutateAsync(q.id);
      pushToast("success", "Soal dihapus.");
    } catch (err) {
      pushToast("error", err instanceof Error ? err.message : "Gagal menghapus soal.");
    }
  }

  if (isLoading) return <SkeletonCard />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-extrabold text-on-surface">
            Topik &amp; Bank Soal
          </h2>
          <p className="mt-1 text-sm text-on-surface-variant">
            Kelola topik kurikulum dan soal latihan adaptif.
          </p>
        </div>
        <Button icon="plus" onClick={openCreateTopic}>
          Buat Topik
        </Button>
      </div>

      {isError && (
        <Card>
          <CardContent className="flex flex-col items-start gap-3 p-5">
            <p className="flex items-center gap-2 text-sm font-medium text-error">
              <Icon name="warning" size={16} />
              {error?.message ?? "Gagal memuat topik"}
            </p>
            <Button variant="outline" icon="refresh" onClick={() => void refetch()}>
              Muat Ulang
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Daftar topik */}
        <div className="space-y-3 lg:col-span-2">
          {topicList.length === 0 && (
            <Card>
              <CardContent className="p-5 text-sm text-on-surface-variant">
                Belum ada topik. Buat topik pertama untuk mulai menambah soal.
              </CardContent>
            </Card>
          )}
          {topicList.map((t) => (
            <Card
              key={t.id}
              className={`cursor-pointer transition-colors ${
                selectedTopicId === t.id ? "border-primary" : "hover:border-primary/40"
              }`}
            >
              <CardContent className="flex items-start gap-3 p-4">
                <button
                  type="button"
                  onClick={() => setSelectedTopicId(t.id)}
                  className="flex min-w-0 flex-1 items-start gap-3 text-left"
                >
                  <span
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-white"
                    style={{ backgroundColor: t.color }}
                  >
                    <Icon name={topicIcon(t.icon)} size={20} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold text-on-surface">
                      {t.title}
                    </span>
                    <span className="block truncate text-xs text-on-surface-variant">
                      {t.subtitle || t.slug}
                    </span>
                    <span className="mt-1 flex flex-wrap gap-1">
                      <Badge variant="success">{t.counts.mudah} mudah</Badge>
                      <Badge variant="warning">{t.counts.sedang} sedang</Badge>
                      <Badge variant="error">{t.counts.sulit} sulit</Badge>
                    </span>
                  </span>
                </button>
                <div className="flex shrink-0 flex-col gap-1">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    icon="edit"
                    aria-label="Edit topik"
                    onClick={() => openEditTopic(t)}
                  />
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    icon="trash"
                    aria-label="Hapus topik"
                    onClick={() => removeTopic(t)}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Bank soal */}
        <div className="space-y-4 lg:col-span-3">
          <Card>
            <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <p className="text-sm font-bold text-on-surface">
                  {selectedTopic ? `Soal — ${selectedTopic.title}` : "Bank Soal"}
                </p>
                <p className="text-xs text-on-surface-variant">
                  {selectedTopic
                    ? `${questionsQuery.data?.length ?? 0} soal pada topik ini.`
                    : "Pilih topik di kiri untuk melihat dan mengelola soalnya."}
                </p>
              </div>
              <Button icon="plus" onClick={openCreateQuestion} disabled={!selectedTopicId}>
                Tambah Soal
              </Button>
            </CardContent>
          </Card>

          {selectedTopicId && questionsQuery.isLoading && <SkeletonCard />}

          {selectedTopicId &&
            !questionsQuery.isLoading &&
            (questionsQuery.data?.length ?? 0) === 0 && (
              <Card>
                <CardContent className="p-5 text-sm text-on-surface-variant">
                  Belum ada soal pada topik ini.
                </CardContent>
              </Card>
            )}

          {(questionsQuery.data ?? []).map((q) => (
            <Card key={q.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                      <Badge variant="primary">{q.difficulty}</Badge>
                      <Badge variant="secondary">
                        {TYPES.find((t) => t.value === q.type)?.label ?? q.type}
                      </Badge>
                    </div>
                    <p className="text-sm font-semibold text-on-surface">{q.prompt}</p>
                    {q.latex && (
                      <p className="mt-1 font-mono text-xs text-on-surface-variant">{q.latex}</p>
                    )}
                    <p className="mt-1.5 text-xs text-on-surface-variant">
                      Jawaban:{" "}
                      <span className="font-semibold text-success">{q.expectedAnswer}</span>
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      icon="edit"
                      aria-label="Edit soal"
                      onClick={() => openEditQuestion(q)}
                    />
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      icon="trash"
                      aria-label="Hapus soal"
                      onClick={() => removeQuestion(q)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Modal topik */}
      <Modal
        open={topicModal}
        onClose={() => setTopicModal(false)}
        title={editingTopic ? "Edit Topik" : "Buat Topik Baru"}
        description={
          editingTopic ? `Perbarui ${editingTopic.title}.` : "Tambahkan topik kurikulum."
        }
      >
        <form onSubmit={submitTopic} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Judul" required>
              <Input
                value={topicForm.title}
                onChange={(e) => setTopicForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="Turunan"
                required
                minLength={3}
                maxLength={120}
              />
            </Field>
            <Field label="Slug" required hint="huruf kecil, angka, tanda hubung">
              <Input
                value={topicForm.slug}
                onChange={(e) => setTopicForm((f) => ({ ...f, slug: e.target.value }))}
                placeholder="turunan"
                required
                pattern="[a-z0-9-]+"
              />
            </Field>
          </div>
          <Field label="Subjudul">
            <Input
              value={topicForm.subtitle}
              onChange={(e) => setTopicForm((f) => ({ ...f, subtitle: e.target.value }))}
              placeholder="Laju perubahan & garis singgung"
              maxLength={160}
            />
          </Field>
          <Field label="Deskripsi">
            <textarea
              value={topicForm.description}
              onChange={(e) => setTopicForm((f) => ({ ...f, description: e.target.value }))}
              rows={3}
              maxLength={1000}
              placeholder="Ringkasan singkat topik…"
              className="w-full rounded-xl border border-outline-variant bg-surface px-3.5 py-3 text-sm text-on-surface placeholder:text-on-surface-variant/60 transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25"
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Ikon">
              <Select
                value={topicForm.icon}
                onChange={(e) => setTopicForm((f) => ({ ...f, icon: e.target.value }))}
              >
                {ICON_OPTIONS.map((i) => (
                  <option key={i} value={i}>
                    {i}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Warna">
              <Select
                value={topicForm.color}
                onChange={(e) => setTopicForm((f) => ({ ...f, color: e.target.value }))}
              >
                {COLOR_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Urutan">
              <Input
                type="number"
                min={0}
                max={999}
                value={topicForm.order}
                onChange={(e) => setTopicForm((f) => ({ ...f, order: Number(e.target.value) }))}
              />
            </Field>
          </div>
          <div className="flex flex-wrap justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setTopicModal(false)}>
              Batal
            </Button>
            <Button type="submit" loading={savingTopic} icon="save">
              {editingTopic ? "Simpan" : "Buat Topik"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal soal */}
      <Modal
        open={questionModal}
        onClose={() => setQuestionModal(false)}
        title={editingQuestion ? "Edit Soal" : "Tambah Soal"}
        description={selectedTopic ? `Topik: ${selectedTopic.title}` : undefined}
      >
        <form onSubmit={submitQuestion} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Tingkat kesulitan" required>
              <Select
                value={questionForm.difficulty}
                onChange={(e) =>
                  setQuestionForm((f) => ({ ...f, difficulty: e.target.value as Difficulty }))
                }
              >
                {DIFFICULTIES.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Tipe jawaban" required>
              <Select
                value={questionForm.type}
                onChange={(e) =>
                  setQuestionForm((f) => ({ ...f, type: e.target.value as QuestionType }))
                }
              >
                {TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="Soal" required>
            <textarea
              value={questionForm.prompt}
              onChange={(e) => setQuestionForm((f) => ({ ...f, prompt: e.target.value }))}
              rows={3}
              required
              maxLength={2000}
              className="w-full rounded-xl border border-outline-variant bg-surface px-3.5 py-3 text-sm text-on-surface placeholder:text-on-surface-variant/60 transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25"
            />
          </Field>
          <Field label="LaTeX" hint="Opsional. Contoh: \\frac{d}{dx}x^2">
            <Input
              value={questionForm.latex}
              onChange={(e) => setQuestionForm((f) => ({ ...f, latex: e.target.value }))}
              placeholder="x^2 + 3x"
              maxLength={500}
            />
          </Field>
          {questionForm.type === "choice" && (
            <Field label="Opsi jawaban" required hint="Satu opsi per baris, minimal 2.">
              <textarea
                value={questionForm.options}
                onChange={(e) => setQuestionForm((f) => ({ ...f, options: e.target.value }))}
                rows={4}
                className="w-full rounded-xl border border-outline-variant bg-surface px-3.5 py-3 text-sm text-on-surface placeholder:text-on-surface-variant/60 transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25"
              />
            </Field>
          )}
          <Field label="Jawaban benar" required hint="Untuk pilihan ganda, tulis opsi yang benar.">
            <Input
              value={questionForm.expectedAnswer}
              onChange={(e) => setQuestionForm((f) => ({ ...f, expectedAnswer: e.target.value }))}
              required
              maxLength={200}
            />
          </Field>
          <Field label="Pembahasan" required>
            <textarea
              value={questionForm.explanation}
              onChange={(e) => setQuestionForm((f) => ({ ...f, explanation: e.target.value }))}
              rows={3}
              required
              maxLength={3000}
              className="w-full rounded-xl border border-outline-variant bg-surface px-3.5 py-3 text-sm text-on-surface placeholder:text-on-surface-variant/60 transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25"
            />
          </Field>
          <Field label="Petunjuk" hint="Opsional.">
            <Input
              value={questionForm.hint}
              onChange={(e) => setQuestionForm((f) => ({ ...f, hint: e.target.value }))}
              maxLength={500}
            />
          </Field>
          <div className="flex flex-wrap justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setQuestionModal(false)}>
              Batal
            </Button>
            <Button type="submit" loading={savingQuestion} icon="save">
              {editingQuestion ? "Simpan" : "Tambah Soal"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
