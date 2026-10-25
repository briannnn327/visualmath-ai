import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { homeFor } from "@/components/layout/nav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { getCurrentPublicUser, getStudentMaterial } from "@/lib/server/data";
import { formatDate } from "@/lib/utils";

export default async function MateriDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentPublicUser();
  if (!user) redirect("/login");
  if (user.role !== "mahasiswa") redirect(homeFor(user.role));

  const { id } = await params;
  const material = await getStudentMaterial(user, id);
  if (!material) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link
        href="/materi"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
      >
        <Icon name="arrow-left" size={15} />
        Semua materi
      </Link>

      <Card>
        <CardContent className="space-y-4 p-6">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={material.type === "soal" ? "warning" : "info"}>
              {material.type === "soal" ? "Contoh Soal" : "Materi"}
            </Badge>
            {material.topicTitle && <Badge variant="neutral">{material.topicTitle}</Badge>}
            {material.kelasName && (
              <Badge variant="primary">
                <Icon name="school" size={12} />
                {material.kelasName}
              </Badge>
            )}
          </div>
          <div>
            <h1 className="font-display text-2xl font-extrabold text-on-surface">
              {material.title}
            </h1>
            <p className="mt-1 text-xs text-on-surface-variant">
              Diperbarui {formatDate(material.updatedAt)}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="whitespace-pre-wrap text-sm leading-7 text-on-surface">
            {material.content}
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Link href={`/latihan?topic=${material.topicId}`}>
          <Button icon="target">Latihan topik ini</Button>
        </Link>
        <Link href="/materi">
          <Button variant="outline" icon="arrow-left">
            Kembali
          </Button>
        </Link>
      </div>
    </div>
  );
}
