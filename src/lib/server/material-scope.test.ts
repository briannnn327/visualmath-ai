import { beforeEach, describe, expect, it, vi } from "vitest";
import { listKelas } from "@/lib/db/store";
import {
  canAccessMaterial,
  materialScope,
  ragKelasIds,
  scopeFrom,
} from "@/lib/server/material-scope";
import type { Kelas, MaterialItem, User } from "@/lib/types";

vi.mock("@/lib/db/store", () => ({
  listKelas: vi.fn(),
}));

function user(overrides: Record<string, unknown> = {}): User {
  return {
    id: "u-1",
    name: "Budi",
    email: "budi@kampus.id",
    password: "hash",
    role: "mahasiswa",
    kelasId: "k-1",
    color: "--color-primary",
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  } as unknown as User;
}

function material(overrides: Record<string, unknown> = {}): MaterialItem {
  return {
    id: "m-1",
    kelasId: "k-1",
    topicId: "t-1",
    type: "materi",
    title: "Turunan",
    content: "Isi",
    createdBy: "u-dosen",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  } as unknown as MaterialItem;
}

describe("material-scope", () => {
  beforeEach(() => {
    vi.mocked(listKelas).mockReset();
  });

  it("admin melihat semua materi", () => {
    const scope = scopeFrom(user({ role: "admin", kelasId: undefined }), []);
    expect(scope.all).toBe(true);
    expect(ragKelasIds(scope)).toBeUndefined();
    expect(canAccessMaterial(scope, material({ kelasId: "lain" }))).toBe(true);
  });

  it("mahasiswa hanya melihat materi kelasnya", () => {
    const scope = scopeFrom(user(), []);
    expect(scope.kelasIds).toEqual(["k-1"]);
    expect(ragKelasIds(scope)).toEqual(["k-1"]);
    expect(canAccessMaterial(scope, material())).toBe(true);
    expect(canAccessMaterial(scope, material({ kelasId: "k-2" }))).toBe(false);
  });

  it("mahasiswa tanpa kelas tidak mendapat akses", () => {
    const scope = scopeFrom(user({ kelasId: undefined }), []);
    expect(scope.kelasIds).toEqual([]);
    expect(canAccessMaterial(scope, material())).toBe(false);
  });

  it("dosen memakai daftar kelas yang diampu (unik)", async () => {
    vi.mocked(listKelas).mockResolvedValue([
      { id: "k-1", dosenId: "u-dosen" },
      { id: "k-2", dosenId: "u-dosen" },
      { id: "k-3", dosenId: "u-lain" },
    ] as unknown as Kelas[]);
    const scope = await materialScope(user({ id: "u-dosen", role: "dosen", kelasId: undefined }));
    expect(scope.kelasIds).toEqual(["k-1", "k-2"]);
    expect(canAccessMaterial(scope, material({ kelasId: "k-2" }))).toBe(true);
    expect(canAccessMaterial(scope, material({ kelasId: "k-3", createdBy: "u-lain" }))).toBe(false);
    expect(canAccessMaterial(scope, material({ kelasId: "k-9", createdBy: "u-dosen" }))).toBe(true);
  });

  it("tidak menyentuh DB untuk peran non-dosen", async () => {
    const scope = await materialScope(user());
    expect(scope.kelasIds).toEqual(["k-1"]);
    expect(listKelas).not.toHaveBeenCalled();
  });
});
