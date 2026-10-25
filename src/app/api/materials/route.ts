import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { reindexMaterial } from "@/lib/ai/rag";
import {
  createMaterial,
  deleteMaterial,
  getKelasById,
  getTopicById,
  listMaterials,
  recordActivity,
  updateMaterial,
} from "@/lib/db/store";
import { type MaterialInput, materialSchema, parseBody } from "@/lib/schemas";
import { apiUser, badRequest, forbidden, notFound, unauthorized } from "@/lib/server/api-auth";
import { canAccessMaterial, materialScope } from "@/lib/server/material-scope";
import type { MaterialItem } from "@/lib/types";
import { uid } from "@/lib/utils";

async function withMeta(m: MaterialItem) {
  const [topic, kelas] = await Promise.all([getTopicById(m.topicId), getKelasById(m.kelasId)]);
  return {
    ...m,
    topicTitle: topic?.title ?? "",
    kelasName: kelas?.nama ?? "",
  };
}

export async function GET(request: NextRequest) {
  const user = await apiUser(request);
  if (!user) return unauthorized();

  const kelasId = request.nextUrl.searchParams.get("kelasId");
  const topicId = request.nextUrl.searchParams.get("topicId");
  const scope = await materialScope(user);
  const all = await listMaterials();
  const list = all
    .filter((m) => canAccessMaterial(scope, m))
    .filter((m) => (kelasId ? m.kelasId === kelasId : true))
    .filter((m) => (topicId ? m.topicId === topicId : true))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const result = await Promise.all(list.map(withMeta));
  return NextResponse.json({ materials: result });
}

export async function POST(request: NextRequest) {
  const user = await apiUser(request);
  if (!user) return unauthorized();
  if (user.role !== "dosen" && user.role !== "admin") return forbidden();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("Request body tidak valid");
  }

  let input: MaterialInput;
  try {
    input = parseBody<MaterialInput>(body, materialSchema);
  } catch (err) {
    return badRequest(err instanceof Error ? err.message : "Data tidak valid");
  }

  const scope = await materialScope(user);
  if (!scope.all && !scope.kelasIds.includes(input.kelasId)) {
    return forbidden();
  }
  if (!(await getKelasById(input.kelasId))) return badRequest("Kelas tidak ditemukan");
  if (!(await getTopicById(input.topicId))) return badRequest("Topik tidak ditemukan");

  const item = await createMaterial({
    id: uid("mt-"),
    kelasId: input.kelasId,
    topicId: input.topicId,
    type: input.type,
    title: input.title,
    content: input.content,
    difficulty: input.difficulty,
    createdBy: user.id,
  });

  await recordActivity({
    userId: user.id,
    actorName: user.name,
    action: "material.create",
    target: item.title,
    severity: "info",
  });

  const embedded = await reindexMaterial(item.id, item.title, item.content);

  return NextResponse.json({ material: { ...(await withMeta(item)), embedded } }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const user = await apiUser(request);
  if (!user) return unauthorized();
  if (user.role !== "dosen" && user.role !== "admin") return forbidden();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("Request body tidak valid");
  }
  const { id, ...patch } = body as MaterialInput & { id: string };
  const all = await listMaterials();
  const item = all.find((m) => m.id === id);
  if (!item) return notFound("Materi tidak ditemukan");
  const scope = await materialScope(user);
  if (!canAccessMaterial(scope, item)) return forbidden();

  const valid = materialSchema.safeParse(patch);
  if (!valid.success) return badRequest(valid.error.issues[0]?.message ?? "Data tidak valid");
  if (!scope.all && !scope.kelasIds.includes(valid.data.kelasId)) return forbidden();
  if (!(await getKelasById(valid.data.kelasId))) return badRequest("Kelas tidak ditemukan");
  if (!(await getTopicById(valid.data.topicId))) return badRequest("Topik tidak ditemukan");
  const updated = await updateMaterial(item.id, valid.data);

  await recordActivity({
    userId: user.id,
    actorName: user.name,
    action: "material.update",
    target: updated.title,
    severity: "info",
  });

  const embedded = await reindexMaterial(updated.id, updated.title, updated.content);

  return NextResponse.json({ material: { ...(await withMeta(updated)), embedded } });
}

export async function DELETE(request: NextRequest) {
  const user = await apiUser(request);
  if (!user) return unauthorized();
  if (user.role !== "dosen" && user.role !== "admin") return forbidden();

  const { id } = (await request.json().catch(() => ({}))) as { id?: string };
  if (!id) return badRequest("id diperlukan");
  const all = await listMaterials();
  const item = all.find((m) => m.id === id);
  if (!item) return notFound("Materi tidak ditemukan");
  const scope = await materialScope(user);
  if (!canAccessMaterial(scope, item)) return forbidden();
  await deleteMaterial(item.id);
  await recordActivity({
    userId: user.id,
    actorName: user.name,
    action: "material.delete",
    target: item.title,
    severity: "info",
  });
  return NextResponse.json({ ok: true });
}
