import { redirect } from "next/navigation";
import { getCurrentPublicUser } from "@/lib/server/data";
import { homeFor } from "@/components/layout/nav";
import { Card, CardContent } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Badge } from "@/components/ui/badge";

export const metadata = {
  title: "Peringkat | VisualMath AI",
  description: "Peringkat mahasiswa berdasarkan performa belajar.",
};

export default async function PeringkatPage() {
  const user = await getCurrentPublicUser();
  if (!user) redirect("/login");
  if (user.role !== "mahasiswa") redirect(homeFor(user.role));

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.24em] text-primary">Peringkat</p>
        <h2 className="mt-1 font-display text-2xl font-extrabold text-on-surface">Peringkat</h2>
        <p className="mt-1 text-sm text-on-surface-variant">
          Peringkat mahasiswa berdasarkan rata-rata penguasaan topik.
        </p>
      </div>

      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-warning-container text-on-warning-container">
            <Icon name="award" size={26} />
          </span>
          <h3 className="font-display text-lg font-bold text-on-surface">Segera Hadir</h3>
          <p className="max-w-md text-sm text-on-surface-variant">
            Fitur peringkat global dan per kelas sedang dalam pengembangan.
          </p>
          <Badge variant="outline">Dalam Pengembangan</Badge>
        </CardContent>
      </Card>
    </div>
  );
}
