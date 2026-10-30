import { tanggal as formatTanggal, rupiah } from "@opennael/format";
import { useQuery } from "@tanstack/react-query";
import { Undo2 } from "lucide-react";
import { useMemo, useState } from "react";
import { DialogBatal } from "@/komponen/dialog-batal";
import { GalatMuat, Memuat } from "@/komponen/halaman";
import { type Kolom, pembantuKolom, TabelData } from "@/komponen/tabel-data";
import { Button } from "@/komponen/ui/button";
import { ambil, api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { ambilPencocokan, KUNCI_KAS, type Pencocokan } from "../data";

export function DaftarPencocokan({
  mulai,
  selesai,
  hariIni,
}: {
  mulai: string;
  selesai: string;
  hariIni: string;
}) {
  const [batal, setBatal] = useState<Pencocokan | null>(null);
  const q = useQuery({
    queryKey: ["kas", "pencocokan", mulai, selesai],
    queryFn: () => ambilPencocokan(mulai, selesai),
  });
  const kolom = useMemo(() => {
    const k = pembantuKolom<Pencocokan>();
    return [
      k.accessor("tanggal", {
        header: "Tanggal",
        cell: (c) => (
          <span className={cn(c.row.original.dibatalkanAt && "line-through")}>
            {formatTanggal(c.getValue(), "tanpa")}
          </span>
        ),
      }),
      k.accessor("akun", { header: "Akun" }),
      k.accessor((p) => p.dicocokkanOleh.nama, { id: "oleh", header: "Oleh" }),
      k.accessor("saldoBuku", {
        header: "Buku",
        meta: { kanan: true },
        cell: (c) => rupiah(c.getValue()),
      }),
      k.accessor("saldoNyata", {
        header: "Nyata",
        meta: { kanan: true },
        cell: (c) => rupiah(c.getValue()),
      }),
      k.accessor("selisih", {
        header: "Selisih",
        meta: { kanan: true },
        cell: (c) => {
          const n = c.getValue();
          return (
            <span className={cn(n < 0 && "text-red-700", n > 0 && "text-emerald-700")}>
              {n === 0 ? "—" : rupiah(n)}
            </span>
          );
        },
      }),
      k.accessor((p) => (p.dibatalkanAt ? `Batal: ${p.alasanBatal}` : (p.keterangan ?? "")), {
        id: "keterangan",
        header: "Keterangan",
        cell: (c) => <span className="text-muted-foreground">{c.getValue()}</span>,
      }),
      k.display({
        id: "aksi",
        header: "",
        cell: (c) => {
          const p = c.row.original;
          if (p.dibatalkanAt || p.tanggal !== hariIni) return null;
          return (
            <Button
              size="icon"
              variant="ghost"
              title="Batalkan pencocokan"
              aria-label="Batalkan pencocokan"
              className="text-red-700"
              onClick={() => setBatal(p)}
            >
              <Undo2 />
            </Button>
          );
        },
      }),
    ] as Kolom<Pencocokan>[];
  }, [hariIni]);
  if (q.isPending) return <Memuat />;
  if (q.isError) return <GalatMuat galat={q.error} ulangi={() => void q.refetch()} />;
  return (
    <>
      <TabelData kolom={kolom} data={q.data} idBaris={(p) => p.id} kosong="Belum ada pencocokan" />
      {batal ? (
        <DialogBatal
          judul="Batalkan pencocokan?"
          keterangan="Untuk salah hitung — lalu cocokkan ulang."
          segarkan={KUNCI_KAS}
          tutup={() => setBatal(null)}
          kirim={(alasan) =>
            ambil(() =>
              api.kas.kas.pencocokan[":id"].batal.$post({
                param: { id: batal.id },
                json: { alasan },
              }),
            )
          }
        />
      ) : null}
    </>
  );
}
