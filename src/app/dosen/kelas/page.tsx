"use client";

import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Field, Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { SkeletonCard } from "@/components/ui/skeleton";
import { useToastStore } from "@/components/ui/toast";
import type { ClassWithStats } from "@/lib/hooks/queries";
import {
  useAddClassMember,
  useClasses,
  useClassMembers,
  useCreateClass,
  useDeleteClass,
  useRemoveClassMember,
  useUpdateClass,
} from "@/lib/hooks/queries";
import { useAuthStore } from "@/lib/store/authStore";
import type { PublicUser } from "@/lib/types";
import { formatDate, initials } from "@/lib/utils";

export default function DosenKelasPage() {
  const currentUser = useAuthStore((s) => s.user);
  const pushToast = useToastStore((s) => s.push);

  const { data: classes, isLoading, isError, error, refetch } = useClasses();
  const createClass = useCreateClass();
  const updateClass = useUpdateClass();
  const deleteClass = useDeleteClass();
  const addMember = useAddClassMember();
  const removeMember = useRemoveClassMember();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ClassWithStats | null>(null);
  const [kode, setKode] = useState("");
  const [nama, setNama] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [memberClass, setMemberClass] = useState<ClassWithStats | null>(null);
  const [memberQuery, setMemberQuery] = useState("");

  const {
    data: members,
    isLoading: membersLoading,
    isError: membersError,
    error: membersErrorValue,
    refetch: refetchMembers,
  } = useClassMembers(memberClass?.id ?? null);

  const saving = createClass.isPending || updateClass.isPending;

  function openCreate() {
    setEditing(null);
    setKode("");
    setNama("");
    setModalOpen(true);
  }

  function openEdit(k: ClassWithStats) {
    setEditing(k);
    setKode(k.kode);
    setNama(k.nama);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditing(null);
  }

  function openMembers(k: ClassWithStats) {
    setMemberQuery("");
    setMemberClass(k);
  }

  function closeMembers() {
    setMemberClass(null);
    setMemberQuery("");
  }

  async function handleAddMember(e: FormEvent) {
    e.preventDefault();
    if (!memberClass) return;
    if (memberQuery.trim().length < 3) {
      pushToast("warning", "Masukkan email atau NIM mahasiswa.");
      return;
    }
    try {
      const { member } = await addMember.mutateAsync({
        kelasId: memberClass.id,
        query: memberQuery.trim(),
      });
      setMemberQuery("");
      pushToast("success", `${member.name} ditambahkan ke kelas.`);
    } catch (err) {
      pushToast("error", err instanceof Error ? err.message : "Gagal menambah anggota.");
    }
  }

  async function handleRemoveMember(member: PublicUser) {
    if (!memberClass) return;
    if (!window.confirm(`Keluarkan ${member.name} dari kelas ${memberClass.nama}?`)) return;
    try {
      await removeMember.mutateAsync({ kelasId: memberClass.id, userId: member.id });
      pushToast("success", `${member.name} dikeluarkan dari kelas.`);
    } catch (err) {
      pushToast("error", err instanceof Error ? err.message : "Gagal mengeluarkan anggota.");
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!currentUser?.id) {
      pushToast("error", "Sesi belum dimuat. Muat ulang halaman.");
      return;
    }
    if (!kode.trim() || !nama.trim()) {
      pushToast("warning", "Kode dan nama kelas wajib diisi.");
      return;
    }
    const payload = { kode: kode.trim(), nama: nama.trim(), dosenId: currentUser.id };
    try {
      if (editing) {
        await updateClass.mutateAsync({ id: editing.id, ...payload });
        pushToast("success", "Kelas diperbarui.");
      } else {
        await createClass.mutateAsync(payload);
        pushToast("success", "Kelas dibuat.");
      }
      closeModal();
    } catch (err) {
      pushToast("error", err instanceof Error ? err.message : "Gagal menyimpan kelas.");
    }
  }

  async function handleDelete(k: ClassWithStats) {
    if (
      !window.confirm(`Hapus kelas "${k.nama}" (${k.kode})? Mahasiswa di dalamnya tetap tersimpan.`)
    )
      return;
    setDeletingId(k.id);
    try {
      await deleteClass.mutateAsync(k.id);
      pushToast("success", "Kelas dihapus.");
    } catch (err) {
      pushToast("error", err instanceof Error ? err.message : "Gagal menghapus kelas.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-extrabold text-on-surface">Manajemen Kelas</h2>
          <p className="mt-1 text-sm text-on-surface-variant">
            Kelola kelas yang kamu ampu dan pantau progres mahasiswanya.
          </p>
        </div>
        <Button icon="plus" onClick={openCreate}>
          Buat Kelas
        </Button>
      </div>

      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}

      {isError && (
        <Card>
          <CardContent className="flex flex-col items-start gap-3 p-5">
            <p className="flex items-center gap-2 text-sm font-medium text-error">
              <Icon name="warning" size={16} />
              {error?.message ?? "Gagal memuat kelas"}
            </p>
            <Button variant="outline" icon="refresh" onClick={() => void refetch()}>
              Muat Ulang
            </Button>
          </CardContent>
        </Card>
      )}

      {!isLoading && !isError && (classes?.length ?? 0) === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-secondary-container text-on-secondary-container">
              <Icon name="school" size={26} />
            </span>
            <h3 className="font-display text-lg font-bold text-on-surface">Belum ada kelas</h3>
            <p className="max-w-md text-sm text-on-surface-variant">
              Klik &quot;Buat Kelas&quot; untuk membuat kelas pertama yang kamu ampu.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(classes ?? []).map((k) => (
          <Card key={k.id}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary-container text-on-primary-container">
                  <Icon name="school" size={20} />
                </span>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    icon="edit"
                    aria-label="Edit kelas"
                    onClick={() => openEdit(k)}
                  />
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    icon="trash"
                    aria-label="Hapus kelas"
                    loading={deletingId === k.id}
                    onClick={() => handleDelete(k)}
                  />
                </div>
              </div>

              <h3 className="mt-3 font-display text-lg font-bold text-on-surface">{k.nama}</h3>
              <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                {k.kode}
              </p>

              <dl className="mt-4 grid grid-cols-2 gap-2">
                <div className="rounded-xl bg-surface-container/60 p-2.5">
                  <dt className="text-[11px] font-bold uppercase tracking-wide text-on-surface-variant">
                    Siswa
                  </dt>
                  <dd className="font-display text-lg font-extrabold tabular text-on-surface">
                    {k.studentCount}
                  </dd>
                </div>
                <div className="rounded-xl bg-surface-container/60 p-2.5">
                  <dt className="text-[11px] font-bold uppercase tracking-wide text-on-surface-variant">
                    <span className="inline-flex items-center gap-1">
                      <Icon name="target" size={11} />
                      Mastery
                    </span>
                  </dt>
                  <dd className="font-display text-lg font-extrabold tabular text-on-surface">
                    {k.avgMastery}%
                  </dd>
                </div>
              </dl>

              <p className="mt-3 text-xs text-on-surface-variant">
                Dibuat {formatDate(k.createdAt)}
              </p>

              <Button
                variant="outline"
                size="sm"
                icon="users"
                className="mt-3 w-full"
                onClick={() => openMembers(k)}
              >
                Kelola Anggota
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editing ? "Edit Kelas" : "Buat Kelas Baru"}
        description={editing ? `Perbarui ${editing.nama}.` : "Kelas baru akan diampu oleh kamu."}
        size="sm"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Kode kelas" required hint="Singkat & unik. Contoh: A2026">
            <Input
              value={kode}
              onChange={(e) => setKode(e.target.value.toUpperCase())}
              placeholder="A2026"
              required
              maxLength={20}
            />
          </Field>
          <Field label="Nama kelas" required>
            <Input
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              placeholder="Kalkulus I — Reguler A"
              required
              minLength={3}
              maxLength={80}
            />
          </Field>
          <div className="flex flex-wrap justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={closeModal}>
              Batal
            </Button>
            <Button type="submit" loading={saving} icon="save">
              {editing ? "Simpan" : "Buat Kelas"}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={!!memberClass}
        onClose={closeMembers}
        title={`Anggota ${memberClass?.nama ?? ""}`}
        description={`Kode ${memberClass?.kode ?? ""} · ${memberClass?.studentCount ?? 0} mahasiswa`}
        size="md"
      >
        <div className="space-y-4">
          <form onSubmit={handleAddMember} className="space-y-2">
            <Field label="Tambah mahasiswa" hint="Masukkan email atau NIM yang terdaftar.">
              <div className="flex gap-2">
                <Input
                  value={memberQuery}
                  onChange={(e) => setMemberQuery(e.target.value)}
                  placeholder="nama@kampus.id atau V3925001"
                  autoFocus
                />
                <Button type="submit" loading={addMember.isPending} icon="plus">
                  Tambah
                </Button>
              </div>
            </Field>
          </form>

          {membersLoading && <SkeletonCard />}

          {membersError && (
            <div className="flex flex-col items-start gap-2 rounded-xl bg-error-container/50 p-3">
              <p className="text-sm text-error">
                {membersErrorValue?.message ?? "Gagal memuat anggota."}
              </p>
              <Button
                variant="outline"
                size="sm"
                icon="refresh"
                onClick={() => void refetchMembers()}
              >
                Muat Ulang
              </Button>
            </div>
          )}

          {!membersLoading && !membersError && (members?.length ?? 0) === 0 && (
            <p className="rounded-xl bg-surface-container/60 p-4 text-sm text-on-surface-variant">
              Belum ada mahasiswa di kelas ini.
            </p>
          )}

          <div className="space-y-2">
            {(members ?? []).map((member) => (
              <div
                key={member.id}
                className="flex items-center gap-3 rounded-xl border border-outline-variant bg-surface p-3"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-secondary-container text-xs font-bold text-on-secondary-container">
                  {initials(member.name)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-on-surface">{member.name}</p>
                  <p className="truncate text-xs text-on-surface-variant">
                    {member.nim ? `${member.nim} · ` : ""}
                    {member.email}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  icon="trash"
                  aria-label={`Keluarkan ${member.name}`}
                  loading={removeMember.isPending && removeMember.variables?.userId === member.id}
                  onClick={() => void handleRemoveMember(member)}
                />
              </div>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  );
}
