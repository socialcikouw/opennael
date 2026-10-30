import { jam } from "@opennael/format";
import { useQuery } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { DialogHapusLibur } from "@/fitur/pinjaman";
import { GalatMuat, Memuat } from "@/komponen/halaman";
import { type Kolom, pembantuKolom, TabelData } from "@/komponen/tabel-data";
import { useKantor } from "@/lib/kantor";
import { ambilLibur, type Libur } from "../data";
import { TombolSel } from "./tombol-sel";

export function DaftarLibur({ tanggal, hariIni }: { tanggal: string; hariIni: string }) {
  const kantor = useKantor();
  const [hapus, setHapus] = useState<Libur | null>(null);
  const q = useQuery({
    queryKey: ["harian", "libur", tanggal],
    queryFn: () => ambilLibur(tanggal),
  });
  const kolom = useMemo(() => {
    const k = pembantuKolom<Libur>();
    return [
      k.accessor((l) => l.nasabah.nama, {
        id: "nasabah",
        header: "Nasabah",
        cell: (c) => <span className="font-medium">{c.getValue()}</span>,
      }),
      k.accessor("alasanLibur", { header: "Alasan", cell: (c) => c.getValue() ?? "—" }),
      k.accessor((l) => l.pencatat.nama, { id: "kolektor", header: "Ditandai" }),
      k.accessor("dibuatAt", { header: "Jam", cell: (c) => jam(c.getValue(), kantor.zonaWaktu) }),
      k.display({
        id: "aksi",
        header: "",
        cell: (c) =>
          tanggal === hariIni ? (
            <div className="flex justify-end">
              <TombolSel label="Hapus tanda libur" bahaya onClick={() => setHapus(c.row.original)}>
                <Trash2 />
              </TombolSel>
            </div>
          ) : null,
      }),
    ] as Kolom<Libur>[];
  }, [tanggal, hariIni, kantor.zonaWaktu]);

  if (q.isPending) return <Memuat />;
  if (q.isError) return <GalatMuat galat={q.error} ulangi={() => void q.refetch()} />;
  return (
    <>
      <TabelData
        kolom={kolom}
        data={q.data}
        idBaris={(l) => l.id}
        kosong="Tidak ada nasabah yang ditandai libur"
      />
      <p className="text-xs text-muted-foreground">
        Tanda libur yang salah bisa dihapus di hari yang sama — sesudahnya kolektor bisa mencatat
        setorannya.
      </p>
      {hapus ? <DialogHapusLibur libur={hapus} tutup={() => setHapus(null)} /> : null}
    </>
  );
}
