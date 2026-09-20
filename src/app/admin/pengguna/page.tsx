"use client";

import { useMemo, useState, type FormEvent } from "react";
import {
  useAdminUsers,
  useCreateUser,
  useUpdateUser,
  useDeleteUser,
  useClasses,
  type AdminUser,
} from "@/lib/hooks/queries";
import { useAuthStore } from "@/lib/store/authStore";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Field } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { SkeletonCard } from "@/components/ui/skeleton";
import { useToastStore } from "@/components/ui/toast";
import { roleLabel } from "@/lib/schemas";
import { initials, formatDate } from "@/lib/utils";
import type { Role } from "@/lib/types";

type FilterKey = "semua" | Role;

const FILTERS: Array<{ key: FilterKey; label: string }> = [
  { key: "semua", label: "Semua" },
  { key: "mahasiswa", label: "Mahasiswa" },
  { key: "dosen", label: "Dosen" },
  { key: "admin", label: "Admin" },
];

interface FormState {
  name: string;
  email: string;
  role: Role;
  password: string;
  kelasId: string;
  nim: string;
  prodi: string;
}

const emptyForm: FormState = {
  name: "",
  email: "",
  role: "mahasiswa",
  password: "",
  kelasId: "",
  nim: "",
  prodi: "",
};

const roleBadge: Record<Role, "primary" | "secondary" | "tertiary"> = {
  mahasiswa: "primary",
  dosen: "secondary",
  admin: "tertiary",
};

export default function AdminPenggunaPage() {
  const currentUser = useAuthStore((s) => s.user);
  const pushToast = useToastStore((s) => s.push);

  const { data: users, isLoading } = useAdminUsers();
  const { data: classes } = useClasses();
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const deleteUser = useDeleteUser();

  const [filter, setFilter] = useState<FilterKey>("semua");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const saving = createUser.isPending || updateUser.isPending;
  const isOwn = (id: string) => currentUser?.id === id;

  const classList = classes ?? [];
  const filtered = useMemo(() => {
    if (!users) return [];
    return filter === "semua" ? users : users.filter((u) => u.role === filter);
  }, [users, filter]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEdit(u: AdminUser) {
    setEditing(u);
    setForm({
      name: u.name,
      email: u.email,
      role: u.role,
      password: "",
      kelasId: u.kelasId ?? "",
      nim: u.nim ?? "",
      prodi: u.prodi ?? "",
    });
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditing(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) {
      pushToast("warning", "Nama dan email wajib diisi.");
      return;
    }
    if (!editing && !form.password) {
      pushToast("warning", "Kata sandi wajib diisi saat membuat pengguna baru.");
      return;
    }
    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      role: form.role,
      password: form.password || undefined,
      nim: form.role === "mahasiswa" ? form.nim.trim() || undefined : undefined,
      prodi: form.role === "mahasiswa" ? form.prodi.trim() || undefined : undefined,
      kelasId: form.role === "mahasiswa" && form.kelasId ? form.kelasId : null,
    };
    try {
      if (editing) {
        await updateUser.mutateAsync({ id: editing.id, ...payload });
        pushToast("success", "Pengguna berhasil diperbarui.");
      } else {
        await createUser.mutateAsync(payload);
        pushToast("success", "Pengguna berhasil ditambahkan.");
      }
      closeModal();
    } catch (err) {
      pushToast("error", err instanceof Error ? err.message : "Gagal menyimpan pengguna.");
    }
  }

  async function handleDelete(u: AdminUser) {
    if (isOwn(u.id)) return;
    if (!window.confirm(`Hapus pengguna "${u.name}"? Tindakan ini tidak dapat dibatalkan.`)) return;
    setDeletingId(u.id);
    try {
      await deleteUser.mutateAsync(u.id);
      pushToast("success", "Pengguna dihapus.");
    } catch (err) {
      pushToast("error", err instanceof Error ? err.message : "Gagal menghapus pengguna.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-extrabold text-on-surface">Kelola Pengguna</h2>
          <p className="mt-1 text-sm text-on-surface-variant">
            Tambah, edit, atau hapus akun pengguna aplikasi.
          </p>
        </div>
        <Button icon="plus" onClick={openCreate}>
          Tambah Pengguna
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => {
          const active = filter === f.key;
          return (
            <button
              key={f.key}
              type="button"
              aria-pressed={active}
              onClick={() => setFilter(f.key)}
              className={
                active
                  ? "flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-on-primary shadow-soft"
                  : "flex items-center gap-1.5 rounded-full border border-outline-variant px-4 py-2 text-sm font-semibold text-on-surface-variant transition-colors hover:bg-surface-container"
              }
            >
              {f.label}
              {f.key !== "semua" && (
                <Icon
                  name={f.key === "mahasiswa" ? "user" : f.key === "dosen" ? "school" : "shield"}
                  size={14}
                />
              )}
            </button>
          );
        })}
        {filtered.length > 0 && (
          <Badge variant="neutral">
            <Icon name="users" size={12} />
            {filtered.length} pengguna
          </Badge>
        )}
      </div>

      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}

      {!isLoading && filtered.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Icon name="users" size={40} className="text-on-surface-variant/40" />
            <p className="text-sm text-on-surface-variant">
              {filter === "semua"
                ? "Belum ada pengguna. Klik &quot;Tambah Pengguna&quot; untuk membuat akun baru."
                : `Belum ada pengguna dengan peran ${roleLabel[filter]}.`}
            </p>
          </CardContent>
        </Card>
      )}

      {!isLoading && filtered.length > 0 && (
        <Card className="overflow-x-auto">
          <CardContent className="p-0">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-outline-variant bg-surface-container">
                  <th className="px-5 py-3 text-left font-semibold text-on-surface">Pengguna</th>
                  <th className="px-4 py-3 text-left font-semibold text-on-surface">Email</th>
                  <th className="px-4 py-3 text-left font-semibold text-on-surface">Peran</th>
                  <th className="px-4 py-3 text-left font-semibold text-on-surface">Kelas</th>
                  <th className="px-4 py-3 text-left font-semibold text-on-surface">Dibuat</th>
                  <th className="px-4 py-3 text-right font-semibold text-on-surface">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => (
                  <tr
                    key={u.id}
                    className="border-b border-outline-variant/50 transition-colors hover:bg-surface-container/50"
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-bold text-on-primary"
                          style={{ backgroundColor: u.color }}
                        >
                          {initials(u.name)}
                        </div>
                        <div className="min-w-0">
                          <p className="flex items-center gap-1.5 font-semibold text-on-surface">
                            <span className="truncate">{u.name}</span>
                            {isOwn(u.id) && <Badge variant="primary">Kamu</Badge>}
                          </p>
                          {u.nim && (
                            <p className="truncate text-xs text-on-surface-variant">{u.nim}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-on-surface-variant">{u.email}</td>
                    <td className="px-4 py-3">
                      <Badge variant={roleBadge[u.role]}>{roleLabel[u.role]}</Badge>
                    </td>
                    <td className="px-4 py-3 text-on-surface-variant">
                      {u.kelasName ? (
                        u.kelasKode ? (
                          `${u.kelasName} (${u.kelasKode})`
                        ) : (
                          u.kelasName
                        )
                      ) : (
                        <span className="text-on-surface-variant/50">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-on-surface-variant">
                      {formatDate(u.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          icon="edit"
                          aria-label="Edit pengguna"
                          disabled={isOwn(u.id)}
                          onClick={() => openEdit(u)}
                        />
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          icon="trash"
                          aria-label="Hapus pengguna"
                          disabled={isOwn(u.id)}
                          loading={deletingId === u.id}
                          onClick={() => handleDelete(u)}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editing ? "Edit Pengguna" : "Tambah Pengguna"}
        description={
          editing
            ? `Perbarui data ${editing.name}.`
            : "Isi data untuk membuat akun pengguna baru."
        }
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Nama" required>
            <Input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Nama lengkap"
              required
              minLength={3}
            />
          </Field>

          <Field label="Email" required>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="nama@kampus.id"
              required
            />
          </Field>

          <Field label="Peran" required>
            <Select
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as Role }))}
            >
              {(Object.keys(roleLabel) as Role[]).map((r) => (
                <option key={r} value={r}>
                  {roleLabel[r]}
                </option>
              ))}
            </Select>
          </Field>

          {editing ? (
            <Field label="Kata Sandi" hint="Kosongkan jika tidak ingin mengubah kata sandi.">
              <Input
                type="password"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                placeholder="••••••••"
              />
            </Field>
          ) : (
            <Field label="Kata Sandi" required hint="Minimal 4 karakter.">
              <Input
                type="password"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                placeholder="••••••••"
                required
                minLength={4}
              />
            </Field>
          )}

          {form.role === "mahasiswa" && (
            <>
              <Field label="Kelas">
                <Select
                  value={form.kelasId}
                  onChange={(e) => setForm((f) => ({ ...f, kelasId: e.target.value }))}
                >
                  <option value="">— Pilih kelas —</option>
                  {classList.map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.nama} ({k.kode})
                    </option>
                  ))}
                </Select>
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="NIM">
                  <Input
                    value={form.nim}
                    onChange={(e) => setForm((f) => ({ ...f, nim: e.target.value }))}
                    placeholder="V3925xxx"
                    maxLength={20}
                  />
                </Field>
                <Field label="Program Studi">
                  <Input
                    value={form.prodi}
                    onChange={(e) => setForm((f) => ({ ...f, prodi: e.target.value }))}
                    placeholder="D3 Teknik Informatika"
                    maxLength={80}
                  />
                </Field>
              </div>
            </>
          )}

          <div className="flex flex-wrap justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={closeModal}>
              Batal
            </Button>
            <Button type="submit" loading={saving} icon="save">
              {editing ? "Simpan Perubahan" : "Tambah Pengguna"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}