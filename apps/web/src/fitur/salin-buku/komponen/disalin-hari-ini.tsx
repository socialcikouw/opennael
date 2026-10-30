import type { Aktivitas } from "@opennael/contracts";
import { jam, rupiah } from "@opennael/format";
import { useQuery } from "@tanstack/react-query";
import { Undo2 } from "lucide-react";
import { useState } from "react";
import { DialogBatal } from "@/komponen/dialog-batal";
import { GalatMuat, Kosong, Memuat } from "@/komponen/halaman";
import { Badge } from "@/komponen/ui/badge";
import { Button } from "@/komponen/ui/button";
import { ambil, api } from "@/lib/api";
import { useHariIni, useKantor } from "@/lib/kantor";
import { cn } from "@/lib/utils";

/** Salinan hari ini dari aktivitas — bisa dibatalkan di hari yang sama. */
export function DisalinHariIni() {
  const kantor = useKantor();
  const hariIni = useHariIni();
  const [batal, setBatal] = useState<Aktivitas | null>(null);
  const q = useQuery({
    queryKey: ["aktivitas", hariIni, null],
    queryFn: () => ambil(() => api.pelaporan.aktivitas.$get({ query: { tanggal: hariIni } })),
  });
  if (q.isPending) return <Memuat />;
  if (q.isError) return <GalatMuat galat={q.error} ulangi={() => void q.refetch()} />;
  const batalId = new Set(
    q.data.filter((a) => a.kejadian === "batal_salin_pinjaman").map((a) => a.rujukan.id),
  );
  const salinan = q.data.filter((a) => a.kejadian === "salin_pinjaman");
  if (salinan.length === 0) return <Kosong>Belum ada yang disalin hari ini</Kosong>;
  return (
    <>
      <ul className="divide-y text-sm">
        {salinan.map((a) => {
          const dibatalkan = batalId.has(a.rujukan.id);
          return (
            <li key={a.rujukan.id} className="flex items-center gap-3 py-2">
              <span className="w-12 text-muted-foreground tabular-nums">
                {jam(a.waktu, kantor.zonaWaktu)}
              </span>
              <span className={cn("flex-1", dibatalkan && "text-muted-foreground line-through")}>
                {a.ringkasan.replace("Salin dari buku: ", "")}
              </span>
              <span className="tabular-nums">{rupiah(a.nominal ?? 0)}</span>
              {dibatalkan ? (
                <Badge variant="destructive">Batal</Badge>
              ) : (
                <Button
                  size="icon"
                  variant="ghost"
                  title="Batalkan salinan"
                  aria-label={`Batalkan salinan ${a.ringkasan}`}
                  className="text-red-700"
                  onClick={() => setBatal(a)}
                >
                  <Undo2 />
                </Button>
              )}
            </li>
          );
        })}
      </ul>
      {batal ? (
        <DialogBatal
          judul="Batalkan salinan?"
          keterangan={`${batal.ringkasan}. Tabungan pembukanya ikut ditarik. Hanya hari ini, sebelum ada setoran.`}
          segarkan={[["nasabah"]]}
          tutup={() => setBatal(null)}
          kirim={(alasan) =>
            ambil(() =>
              api.pembiayaan.pinjaman[":id"].batal.$post({
                param: { id: batal.rujukan.id },
                json: { alasan },
              }),
            )
          }
        />
      ) : null}
    </>
  );
}
