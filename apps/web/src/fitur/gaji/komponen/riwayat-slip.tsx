import { tanggal as formatTanggal, rupiah } from "@opennael/format";
import { useQuery } from "@tanstack/react-query";
import { Undo2 } from "lucide-react";
import { useMemo, useState } from "react";
import { DialogBatal } from "@/komponen/dialog-batal";
import { GalatMuat, Memuat } from "@/komponen/halaman";
import { type Kolom, pembantuKolom, TabelData } from "@/komponen/tabel-data";
import { Badge } from "@/komponen/ui/badge";
import { Button } from "@/komponen/ui/button";
import { ambil, api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { ambilSlip, type Slip } from "../data";

export function RiwayatSlip({ kolektorId, hariIni }: { kolektorId?: string; hariIni: string }) {
  const [batal, setBatal] = useState<Slip | null>(null);
  const q = useQuery({
    queryKey: ["gaji", "slip", kolektorId ?? null],
    queryFn: () => ambilSlip(kolektorId),
  });
  const kolom = useMemo(() => {
    const k = pembantuKolom<Slip>();
    return [
      k.accessor((s) => s.kolektor.nama, {
        id: "kolektor",
        header: "Kolektor",
        cell: (c) => (
          <span className={cn("font-medium", c.row.original.dibatalkanAt && "line-through")}>
            {c.getValue()}
          </span>
        ),
      }),
      k.accessor("periodeMulai", {
        header: "Periode",
        cell: (c) =>
          `${formatTanggal(c.getValue(), "tanpa")} – ${formatTanggal(c.row.original.periodeSelesai, "tanpa")}`,
      }),
      k.accessor("gajiKotor", {
        header: "Kotor",
        meta: { kanan: true },
        cell: (c) => rupiah(c.getValue()),
      }),
      k.accessor("potonganTekor", {
        header: "Tekor",
        meta: { kanan: true },
        cell: (c) => (c.getValue() ? rupiah(c.getValue()) : "—"),
      }),
      k.accessor("gajiBersih", {
        header: "Bersih",
        meta: { kanan: true },
        cell: (c) => <span className="font-medium">{rupiah(c.getValue())}</span>,
      }),
      k.accessor("tanggalBayar", {
        header: "Dibayar",
        cell: (c) => `${formatTanggal(c.getValue(), "tanpa")} · ${c.row.original.dariAkun}`,
      }),
      k.display({
        id: "aksi",
        header: "",
        cell: (c) => {
          const s = c.row.original;
          if (s.dibatalkanAt) return <Badge variant="destructive">Batal: {s.alasanBatal}</Badge>;
          if (s.tanggalBayar !== hariIni) return null;
          return (
            <Button
              size="icon"
              variant="ghost"
              title="Batalkan pembayaran"
              aria-label="Batalkan pembayaran"
              className="text-red-700"
              onClick={() => setBatal(s)}
            >
              <Undo2 />
            </Button>
          );
        },
      }),
    ] as Kolom<Slip>[];
  }, [hariIni]);
  if (q.isPending) return <Memuat />;
  if (q.isError) return <GalatMuat galat={q.error} ulangi={() => void q.refetch()} />;
  return (
    <>
      <TabelData kolom={kolom} data={q.data} idBaris={(s) => s.id} kosong="Belum ada slip gaji" />
      {batal ? (
        <DialogBatal
          judul={`Batalkan gaji ${batal.kolektor.nama}?`}
          keterangan={`${rupiah(batal.gajiBersih)} kembali ke kas ${batal.dariAkun}. Hanya di hari yang sama.`}
          segarkan={[["gaji"], ["kas"]]}
          tutup={() => setBatal(null)}
          kirim={(alasan) =>
            ambil(() =>
              api.penggajian.kas.gaji[":id"].batal.$post({
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
