"use client";

import { useState, type FormEvent } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Field } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";
import { SkeletonCard } from "@/components/ui/skeleton";
import { Icon } from "@/components/ui/icon";
import { useToastStore } from "@/components/ui/toast";
import {
  useClasses,
  useTopics,
  useMaterials,
  useCreateMaterial,
  useUpdateMaterial,
  useDeleteMaterial,
  type MaterialWithMeta,
} from "@/lib/hooks/queries";
import { materialSchema, materialTypeLabel, difficultyLabel } from "@/lib/schemas";
import { formatDate } from "@/lib/utils";
import type { Difficulty, MaterialType } from "@/lib/types";

const TYPE_OPTIONS: MaterialType[] = ["materi", "soal"];
const DIFFICULTY_OPTIONS: Difficulty[] = ["mudah", "sedang", "sulit"];

const diffBadge: Record<Difficulty, "success" | "warning" | "error"> = {
  mudah: "success",
  sedang: "warning",
  sulit: "error",
};

interface FormState {
  kelasId: string;
  topicId: string;
  type: MaterialType;
  title: string;
  content: string;
  difficulty: Difficulty | "";
}

function emptyForm(kelasId: string): FormState {
  return { kelasId, topicId: "", type: "materi", title: "", content: "", difficulty: "" };
}

export default function DosenMateriPage() {
  const classes = useClasses();
  const topics = useTopics();
  const [kelasId, setKelasId] = useState<string | null>(null);
  const [kelasTouched, setKelasTouched] = useState(false);
  const materials = useMaterials(kelasId);

  const createMaterial = useCreateMaterial();
  const updateMaterial = useUpdateMaterial();
  const deleteMaterial = useDeleteMaterial();
  const pushToast = useToastStore((s) => s.push);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<MaterialWithMeta | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm(""));
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const classList = classes.data ?? [];
  const saving = createMaterial.isPending || updateMaterial.isPending;

  if (!kelasTouched && kelasId === null && classList.length > 0) {
    setKelasId(classList[0].id);
  }

  function openCreate() {
    setEditing(null);
    setForm(emptyForm(kelasId ?? classList[0]?.id ?? ""));
    setModalOpen(true);
  }

  function openEdit(m: MaterialWithMeta) {
    setEditing(m);
    setForm({
      kelasId: m.kelasId,
      topicId: m.topicId,
      type: m.type,
      title: m.title,
      content: m.content,
      difficulty: m.difficulty ?? "",
    });
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditing(null);
  }

  async function submitMaterial(e: FormEvent) {
    e.preventDefault();
    const parsed = materialSchema.safeParse({
      kelasId: form.kelasId,
      topicId: form.topicId,
      type: form.type,
      title: form.title,
      content: form.content,
      difficulty: form.difficulty || undefined,
    });
    if (!parsed.success) {
      pushToast("error", parsed.error.issues[0]?.message ?? "Data tidak valid");
      return;
    }
    try {
      if (editing) {
        await updateMaterial.mutateAsync({ id: editing.id, ...parsed.data });
        pushToast("success", "Materi berhasil diperbarui");
      } else {
        await createMaterial.mutateAsync(parsed.data);
        pushToast("success", "Materi berhasil ditambahkan");
      }
      closeModal();
    } catch (err) {
      pushToast("error", err instanceof Error ? err.message : "Gagal menyimpan materi");
    }
  }

  async function handleDelete(m: MaterialWithMeta) {
    if (!window.confirm(`Hapus materi "${m.title}"?`)) return;
    setDeletingId(m.id);
    try {
      await deleteMaterial.mutateAsync(m.id);
      pushToast("success", "Materi berhasil dihapus");
    } catch (err) {
      pushToast("error", err instanceof Error ? err.message : "Gagal menghapus materi");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-extrabold text-on-surface">Materi Pembelajaran</h2>
          <p className="mt-1 text-sm text-on-surface-variant">
            Kelola bahan ajar dan kumpulan soal untuk kelasmu.
          </p>
        </div>
        <Button icon="plus" onClick={openCreate}>
          Tambah Materi
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="w-full sm:w-72">
          <Select
            value={kelasId ?? ""}
            onChange={(e) => {
              setKelasTouched(true);
              setKelasId(e.target.value || null);
            }}
            aria-label="Filter kelas"
          >
            <option value="">Semua Kelas</option>
            {classList.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nama} · {c.kode}
              </option>
            ))}
          </Select>
        </div>
        {materials.data && (
          <Badge variant="neutral">
            <Icon name="layers" size={12} />
            {materials.data.length} item
          </Badge>
        )}
      </div>

      {classes.isError && (
        <Card>
          <CardContent className="p-5 text-sm text-error">
            {classes.error?.message ?? "Gagal memuat daftar kelas"}
          </CardContent>
        </Card>
      )}

      {materials.isPending && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }, (_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}

      {materials.isError && (
        <Card>
          <CardContent className="p-5 text-sm text-error">
            {materials.error?.message ?? "Gagal memuat materi"}
          </CardContent>
        </Card>
      )}

      {materials.data && materials.data.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-12 text-center">
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-primary-container text-on-primary-container">
              <Icon name="book" size={26} />
            </span>
            <h3 className="font-display text-lg font-bold text-on-surface">Belum ada materi</h3>
            <p className="max-w-md text-sm text-on-surface-variant">
              Tambahkan materi atau kumpulan soal pertama untuk kelas ini.
            </p>
            <Button icon="plus" onClick={openCreate}>
              Tambah Materi
            </Button>
          </CardContent>
        </Card>
      )}

      {materials.data && materials.data.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {materials.data.map((m) => (
            <Card key={m.id} className="h-full">
              <CardContent className="flex h-full flex-col gap-3 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant={m.type === "soal" ? "secondary" : "primary"}>
                      <Icon name={m.type === "soal" ? "quiz" : "book"} size={12} />
                      {materialTypeLabel[m.type]}
                    </Badge>
                    {m.difficulty && (
                      <Badge variant={diffBadge[m.difficulty]}>
                        <Icon name="target" size={12} />
                        {difficultyLabel[m.difficulty]}
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      icon="edit"
                      aria-label="Edit materi"
                      onClick={() => openEdit(m)}
                    />
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      icon="trash"
                      aria-label="Hapus materi"
                      loading={deletingId === m.id}
                      onClick={() => handleDelete(m)}
                    />
                  </div>
                </div>
                <div>
                  <h3 className="font-display text-base font-bold text-on-surface">{m.title}</h3>
                  <p className="mt-0.5 line-clamp-3 text-sm leading-relaxed text-on-surface-variant">
                    {m.content}
                  </p>
                </div>
                <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-outline-variant pt-3 text-xs text-on-surface-variant">
                  <span className="flex items-center gap-1">
                    <Icon name="school" size={13} />
                    {m.kelasName}
                  </span>
                  <span className="flex items-center gap-1">
                    <Icon name="route" size={13} />
                    {m.topicTitle}
                  </span>
                  <span className="ms-auto flex items-center gap-1">
                    <Icon name="clock" size={13} />
                    {formatDate(m.updatedAt)}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editing ? "Edit Materi" : "Tambah Materi"}
        description={
          editing
            ? "Perbarui detail materi pembelajaran."
            : "Buat materi atau kumpulan soal baru untuk kelas."
        }
        size="lg"
      >
        <form onSubmit={submitMaterial} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Kelas" required>
              <Select
                value={form.kelasId}
                onChange={(e) => setForm((f) => ({ ...f, kelasId: e.target.value }))}
                required
              >
                <option value="" disabled>
                  Pilih kelas…
                </option>
                {classList.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nama} ({c.kode})
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Topik" required>
              <Select
                value={form.topicId}
                onChange={(e) => setForm((f) => ({ ...f, topicId: e.target.value }))}
                required
              >
                <option value="" disabled>
                  Pilih topik…
                </option>
                {(topics.data ?? []).map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <Field label="Tipe" required>
            <div className="grid grid-cols-2 gap-2">
              {TYPE_OPTIONS.map((t) => {
                const active = form.type === t;
                return (
                  <button
                    key={t}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setForm((f) => ({ ...f, type: t }))}
                    className={
                      active
                        ? "flex items-center justify-center gap-2 rounded-full border-2 border-primary bg-primary-lighter px-4 py-2 text-sm font-semibold text-primary"
                        : "flex items-center justify-center gap-2 rounded-full border border-outline-variant px-4 py-2 text-sm font-semibold text-on-surface-variant transition-colors hover:border-primary/40 hover:bg-surface-container"
                    }
                  >
                    <Icon name={t === "soal" ? "quiz" : "book"} size={16} />
                    {materialTypeLabel[t]}
                  </button>
                );
              })}
            </div>
          </Field>

          <Field label="Judul" required>
            <Input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Mis. Modul 1 — Turunan Parsial"
              maxLength={140}
              required
            />
          </Field>

          <Field
            label="Konten"
            required
            hint="Minimal 10 karakter. Gunakan notasi LaTeX bila perlu."
          >
            <textarea
              value={form.content}
              onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
              placeholder="Tuliskan rangkuman, langkah, atau daftar soal di sini…"
              rows={6}
              required
              className="w-full rounded-xl border border-outline-variant bg-surface px-3.5 py-3 text-sm text-on-surface placeholder:text-on-surface-variant/60 transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25"
            />
          </Field>

          <Field label="Tingkat Kesulitan" hint="Opsional, umumnya untuk kumpulan soal.">
            <Select
              value={form.difficulty}
              onChange={(e) =>
                setForm((f) => ({ ...f, difficulty: e.target.value as Difficulty | "" }))
              }
            >
              <option value="">Tanpa tingkat</option>
              {DIFFICULTY_OPTIONS.map((d) => (
                <option key={d} value={d}>
                  {difficultyLabel[d]}
                </option>
              ))}
            </Select>
          </Field>

          <div className="flex flex-wrap justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={closeModal}>
              Batal
            </Button>
            <Button type="submit" loading={saving} icon="save">
              {editing ? "Simpan Perubahan" : "Tambah Materi"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}