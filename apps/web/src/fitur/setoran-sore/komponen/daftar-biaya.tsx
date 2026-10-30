import { rupiah } from "@opennael/format";
import { useQuery } from "@tanstack/react-query";
import { Plus, Undo2 } from "lucide-react";
import { useMemo, useState } from "react";
import { DialogBatal } from "@/komponen/dialog-batal";
import { GalatMuat, Memuat } from "@/komponen/halaman";
import { type Kolom, pembantuKolom, TabelData } from "@/komponen/tabel-data";
import { Button } from "@/komponen/ui/button";
import { ambil, api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { ambilBiaya, type Biaya, KUNCI_HARIAN } from "../data";
import { DialogBiaya } from "./dialog-biaya";
import { TombolSel } from "./tombol-sel";

export function DaftarBiaya({
  tanggal,
  hariIni,
  kolektor,
}: {
  tanggal: string;
  hariIni: string;
  kolektor: { id: string; nama: string }[];
}) {
  const [catat, setCatat] = useState(false);
  const [batal, setBatal] = useState<Biaya | null>(null);
  const q = useQuery({
    queryKey: ["harian", "biaya", tanggal],
    queryFn: () => ambilBiaya(tanggal),
  });
  const kolom = useMemo(() => {
    const k = pembantuKolom<Biaya>();
    return [
      k.accessor((b) => b.kolektor.nama, {
        id: "kolektor",
        header: "Kolektor",
        cell: (c) => (
          <span className={cn("font-medium", c.row.original.dibatalkanAt && "line-through")}>
            {c.getValue()}
          </span>
        ),
      }),
      k.accessor("keterangan", { header: "Keterangan" }),
      k.accessor("nominal", {
        header: "Nominal",
        meta: { kanan: true },
        cell: (c) => rupiah(c.getValue()),
      }),
      k.display({
        id: "aksi",
        header: "",
        cell: (c) => {
          const b = c.row.original;
          if (b.dibatalkanAt)
            return <span className="text-xs text-muted-foreground">Batal: {b.alasanBatal}</span>;
          if (tanggal !== hariIni) return null;
          return (
            <div className="flex justify-end">
              <TombolSel label="Batalkan biaya" bahaya onClick={() => setBatal(b)}>
                <Undo2 />
              </TombolSel>
            </div>
          );
        },
      }),
    ] as Kolom<Biaya>[];
  }, [tanggal, hariIni]);

  return (
    <>
      {tanggal === hariIni ? (
        <Button className="w-fit" onClick={() => setCatat(true)} disabled={kolektor.length === 0}>
          <Plus />
          Catat biaya
        </Button>
      ) : null}
      {q.isPending ? (
        <Memuat />
      ) : q.isError ? (
        <GalatMuat galat={q.error} ulangi={() => void q.refetch()} />
      ) : (
        <>
          <TabelData
            kolom={kolom}
            data={q.data.biaya}
            idBaris={(b) => b.id}
            kosong="Tidak ada biaya tak terduga"
          />
          <p className="text-sm">
            Total berlaku:{" "}
            <span className="font-semibold tabular-nums">{rupiah(q.data.total)}</span>
          </p>
        </>
      )}
      {catat ? <DialogBiaya kolektor={kolektor} tutup={() => setCatat(false)} /> : null}
      {batal ? (
        <DialogBatal
          judul={`Batalkan biaya ${batal.kolektor.nama}?`}
          segarkan={KUNCI_HARIAN}
          tutup={() => setBatal(null)}
          kirim={(alasan) =>
            ambil(() =>
              api.hariKolektor["biaya-tak-terduga"][":id"].batal.$post({
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
