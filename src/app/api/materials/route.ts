import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { materialSchema, type MaterialInput, parseBody } from "@/lib/schemas";
import { db, ensureSeeded, getKelasById, getTopicById, recordActivity } from "@/lib/db/store";
import { apiUser, badRequest, forbidden, notFound, unauthorized } from "@/lib/server/api-auth";
import { uid } from "@/lib/utils";
import type { MaterialId, MaterialItem } from "@/lib/types";

function withMeta(m: MaterialItem) {
  return { ...m, topicTitle: getTopicById(m.topicId)?.title ?? "", kelasName: getKelasById(m.kelasId)?.nama ?? "" };
}

export async function GET(request: NextRequest) {
  ensureSeeded();
  const user = apiUser(request);
  if (!user) return unauthorized();
  if (user.role !== "dosen" && user.role !== "admin") return forbidden();

  const kelasId = request.nextUrl.searchParams.get("kelasId");
  const list = db.materials
    .filter((m) => m.createdBy === user.id || user.role === "admin")
    .filter((m) => (kelasId ? m.kelasId === kelasId : true))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return NextResponse.json({ materials: list.map(withMeta) });
}

export async function POST(request: NextRequest) {
  ensureSeeded();
  const user = apiUser(request);
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

  const item: MaterialItem = {
    id: uid("mt-") as MaterialId,
    kelasId: input.kelasId as MaterialItem["kelasId"],
    topicId: input.topicId as MaterialItem["topicId"],
    type: input.type,
    title: input.title,
    content: input.content,
    difficulty: input.difficulty,
    createdBy: user.id,
    updatedAt: new Date().toISOString(),
  };
  db.materials.push(item);

  recordActivity({
    userId: user.id,
    actorName: user.name,
    action: "material.create",
    target: item.title,
    severity: "info",
  });

  return NextResponse.json({ material: withMeta(item) }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  ensureSeeded();
  const user = apiUser(request);
  if (!user) return unauthorized();
  if (user.role !== "dosen" && user.role !== "admin") return forbidden();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("Request body tidak valid");
  }
  const { id, ...patch } = body as MaterialInput & { id: string };
  const item = db.materials.find((m) => m.id === id);
  if (!item) return notFound("Materi tidak ditemukan");
  if (item.createdBy !== user.id && user.role !== "admin") return forbidden();

  const valid = materialSchema.safeParse(patch);
  if (!valid.success) return badRequest(valid.error.issues[0]?.message ?? "Data tidak valid");
  Object.assign(item, valid.data, { updatedAt: new Date().toISOString() });

  recordActivity({ userId: user.id, actorName: user.name, action: "material.update", target: item.title, severity: "info" });
  return NextResponse.json({ material: withMeta(item) });
}

export async function DELETE(request: NextRequest) {
  ensureSeeded();
  const user = apiUser(request);
  if (!user) return unauthorized();
  if (user.role !== "dosen" && user.role !== "admin") return forbidden();

  const { id } = (await request.json().catch(() => ({}))) as { id?: string };
  if (!id) return badRequest("id diperlukan");
  const idx = db.materials.findIndex((m) => m.id === id);
  if (idx < 0) return notFound("Materi tidak ditemukan");
  const item = db.materials[idx];
  if (item.createdBy !== user.id && user.role !== "admin") return forbidden();
  db.materials.splice(idx, 1);
  recordActivity({ userId: user.id, actorName: user.name, action: "material.delete", target: item.title, severity: "info" });
  return NextResponse.json({ ok: true });
}