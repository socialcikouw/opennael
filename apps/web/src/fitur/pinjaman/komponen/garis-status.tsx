import { tanggal as formatTanggal, waktu } from "@opennael/format";
import { useQuery } from "@tanstack/react-query";
import { GalatMuat, Memuat } from "@/komponen/halaman";
import { ambil, api } from "@/lib/api";
import { useKantor } from "@/lib/kantor";
import { LencanaStatus } from "./lencana-status";

export function GarisStatus({ id }: { id: string }) {
  const kantor = useKantor();
  const q = useQuery({
    queryKey: ["pinjaman", "riwayat-status", id],
    queryFn: () =>
      ambil(() => api.pembiayaan.pinjaman[":id"]["riwayat-status"].$get({ param: { id } })),
  });
  if (q.isPending) return <Memuat />;
  if (q.isError) return <GalatMuat galat={q.error} />;
  return (
    <ol className="space-y-1 text-sm">
      {q.data.map((r) => (
        <li key={r.id} className="flex flex-wrap items-center gap-2">
          <span className="w-28 shrink-0 text-muted-foreground">
            {formatTanggal(r.tanggal, "tanpa")}
          </span>
          {r.statusSebelum ? (
            <>
              <LencanaStatus status={r.statusSebelum} />
              <span aria-hidden>→</span>
            </>
          ) : null}
          <LencanaStatus status={r.statusSesudah} />
          <span className="text-xs text-muted-foreground">
            {waktu(r.dibuatAt, kantor.zonaWaktu)}
          </span>
        </li>
      ))}
    </ol>
  );
}
