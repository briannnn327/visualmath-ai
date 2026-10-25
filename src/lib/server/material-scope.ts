/* =========================================================
   Scope akses materi berdasarkan peran & kelas.
   Mahasiswa hanya melihat materi kelasnya; dosen melihat materi
   kelas yang diampu (plus materi yang ia tulis); admin melihat semua.
   ========================================================= */
import { listKelas } from "@/lib/db/store";
import type { MaterialItem, Role, User } from "@/lib/types";

export interface MaterialScope {
  all: boolean;
  kelasIds: string[];
  role: Role;
  userId: string;
}

type ScopeUser = Pick<User, "id" | "role" | "kelasId">;

/** Bagian murni (tanpa DB) agar mudah diuji. */
export function scopeFrom(
  user: ScopeUser,
  taughtKelasIds: string[],
  userId = user.id,
): MaterialScope {
  if (user.role === "admin") return { all: true, kelasIds: [], role: user.role, userId };
  if (user.role === "dosen") {
    return { all: false, kelasIds: [...new Set(taughtKelasIds)], role: user.role, userId };
  }
  return {
    all: false,
    kelasIds: user.kelasId ? [user.kelasId] : [],
    role: user.role,
    userId,
  };
}

/** Hitung scope untuk user yang sedang login. */
export async function materialScope(user: ScopeUser): Promise<MaterialScope> {
  if (user.role !== "dosen") return scopeFrom(user, []);
  const classes = await listKelas();
  return scopeFrom(
    user,
    classes.filter((k) => k.dosenId === user.id).map((k) => k.id),
  );
}

/** Dosen tetap bisa mengelola materi miliknya walau kelas sudah tidak diampu. */
export function canAccessMaterial(scope: MaterialScope, material: MaterialItem): boolean {
  if (scope.all || scope.kelasIds.includes(material.kelasId)) return true;
  return scope.role === "dosen" && material.createdBy === scope.userId;
}

/** Filter yang dipakai RAG: hanya kelas dalam scope (admin = tanpa filter). */
export function ragKelasIds(scope: MaterialScope): string[] | undefined {
  return scope.all ? undefined : scope.kelasIds;
}
