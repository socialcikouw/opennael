import { jam, LABEL_JENIS_TRANSAKSI, rupiah } from "@opennael/format";
import { useQuery } from "@tanstack/react-query";
import { Undo2 } from "lucide-react";
import { useMemo, useState } from "react";
import { DialogBatal } from "@/komponen/dialog-batal";
import { GalatMuat, Memuat } from "@/komponen/halaman";
import { type Kolom, pembantuKolom, TabelData } from "@/komponen/tabel-data";
import { ambil, api } from "@/lib/api";
import { useKantor } from "@/lib/kantor";
import { cn } from "@/lib/utils";
import { ambilTransfer, KUNCI_HARIAN, type Transfer } from "../data";
import { TombolSel } from "./tombol-sel";

export function DaftarTransfer({ tanggal, hariIni }: { tanggal: string; hariIni: string }) {
  const kantor = useKantor();
  const [batal, setBatal] = useState<Transfer | null>(null);
  const q = useQuery({
    queryKey: ["harian", "transfer", tanggal],
    queryFn: () => ambilTransfer(tanggal),
  });
  const kolom = useMemo(() => {
    const k = pembantuKolom<Transfer>();
    return [
      k.accessor((t) => t.nasabah.nama, {
        id: "nasabah",
        header: "Nasabah",
        cell: (c) => (
          <span className={cn("font-medium", c.row.original.dibatalkanAt && "line-through")}>
            {c.getValue()}
          </span>
        ),
      }),
      k.accessor("jenis", { header: "Jenis", cell: (c) => LABEL_JENIS_TRANSAKSI[c.getValue()] }),
      k.accessor("dibuatAt", {
        header: "Dicatat",
        cell: (c) => jam(c.getValue(), kantor.zonaWaktu),
      }),
      k.accessor("nominal", {
        header: "Nominal",
        meta: { kanan: true },
        cell: (c) => rupiah(c.getValue()),
      }),
      k.display({
        id: "aksi",
        header: "",
        cell: (c) => {
          const t = c.row.original;
          if (t.dibatalkanAt)
            return <span className="text-xs text-muted-foreground">Batal: {t.alasanBatal}</span>;
          if (tanggal !== hariIni) return null;
          return (
            <div className="flex justify-end">
              <TombolSel label="Batalkan transfer" bahaya onClick={() => setBatal(t)}>
                <Undo2 />
              </TombolSel>
            </div>
          );
        },
      }),
    ] as Kolom<Transfer>[];
  }, [tanggal, hariIni, kantor.zonaWaktu]);

  if (q.isPending) return <Memuat />;
  if (q.isError) return <GalatMuat galat={q.error} ulangi={() => void q.refetch()} />;
  return (
    <>
      <TabelData
        kolom={kolom}
        data={q.data.transfer}
        idBaris={(t) => t.id}
        kosong="Belum ada transfer. Catat dari tab Setoran nasabah."
      />
      <p className="text-sm">
        Total transfer berlaku:{" "}
        <span className="font-semibold tabular-nums">{rupiah(q.data.total)}</span>
      </p>
      {batal ? (
        <DialogBatal
          judul={`Batalkan transfer ${batal.nasabah.nama}?`}
          segarkan={KUNCI_HARIAN}
          tutup={() => setBatal(null)}
          kirim={(alasan) =>
            ambil(() =>
              api.hariKolektor["transfer-setoran"][":id"].batal.$post({
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
