import type { TabelBerjejak } from "@opennael/contracts";
import { waktu } from "@opennael/format";
import { useQuery } from "@tanstack/react-query";
import { GalatMuat, Kosong, Memuat } from "@/komponen/halaman";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/komponen/ui/dialog";
import { ambil, api } from "@/lib/api";
import { useKantor } from "@/lib/kantor";

/** Nilai kolom riwayat untuk tampilan: teks apa adanya, selain itu JSON ringkas. */
const teksNilai = (v: unknown) =>
  v === null || v === undefined ? "—" : typeof v === "string" ? v : JSON.stringify(v);

/** Jejak perubahan satu baris: sebelum → sesudah per kolom. */
export function DialogRiwayat({
  tabel,
  barisId,
  judul,
  tutup,
}: {
  tabel: TabelBerjejak;
  barisId: string;
  judul: string;
  tutup: () => void;
}) {
  const kantor = useKantor();
  const q = useQuery({
    queryKey: ["riwayat", tabel, barisId],
    queryFn: () => ambil(() => api.pelaporan.riwayat.$get({ query: { tabel, barisId } })),
  });
  return (
    <Dialog open onOpenChange={(buka) => !buka && tutup()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{judul}</DialogTitle>
          <DialogDescription>Semua perubahan pada data ini, terbaru dulu.</DialogDescription>
        </DialogHeader>
        {q.isPending ? (
          <Memuat />
        ) : q.isError ? (
          <GalatMuat galat={q.error} />
        ) : q.data.length === 0 ? (
          <Kosong>Belum pernah diubah</Kosong>
        ) : (
          <ol className="space-y-4">
            {q.data.map((j) => {
              const kunci = [
                ...new Set([...Object.keys(j.sebelum ?? {}), ...Object.keys(j.sesudah ?? {})]),
              ];
              return (
                <li key={`${j.waktu}-${j.aksi}`} className="space-y-2 rounded-lg border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                    <span className="font-medium">{j.aksi.replaceAll("_", " ")}</span>
                    <span className="text-muted-foreground">
                      {j.pelaku.nama} · {waktu(j.waktu, kantor.zonaWaktu)}
                    </span>
                  </div>
                  {j.alasan ? <p className="text-sm text-muted-foreground">{j.alasan}</p> : null}
                  <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
                    {kunci.map((kk) => (
                      <div key={kk} className="contents">
                        <dt className="text-muted-foreground">{kk}</dt>
                        <dd className="break-all">
                          <span className="text-red-700 line-through">
                            {teksNilai(j.sebelum?.[kk])}
                          </span>{" "}
                          → <span className="text-emerald-700">{teksNilai(j.sesudah?.[kk])}</span>
                        </dd>
                      </div>
                    ))}
                  </dl>
                </li>
              );
            })}
          </ol>
        )}
      </DialogContent>
    </Dialog>
  );
}
