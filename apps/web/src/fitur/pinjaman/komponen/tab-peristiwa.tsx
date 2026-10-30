import type { Peristiwa } from "@opennael/contracts";
import { tanggal as formatTanggal, LABEL_PERISTIWA, rupiah } from "@opennael/format";
import { Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { GalatMuat, Memuat } from "@/komponen/halaman";
import { type Kolom, pembantuKolom, TabelData } from "@/komponen/tabel-data";
import { Button } from "@/komponen/ui/button";
import { useHariIni } from "@/lib/kantor";
import { useBuku } from "../data";
import { DialogHapusLibur } from "./dialog-hapus-libur";

// ---- tab peristiwa ------------------------------------------------------------------

export function TabPeristiwa({ nasabahId }: { nasabahId: string }) {
  const q = useBuku(nasabahId);
  const hariIni = useHariIni();
  const [hapus, setHapus] = useState<Peristiwa | null>(null);
  const keKe = useMemo(
    () => new Map((q.data?.pinjaman ?? []).map((p) => [p.id, p.pinjamanKe])),
    [q.data],
  );
  const kolom = useMemo(() => {
    const k = pembantuKolom<Peristiwa>();
    return [
      k.accessor("tanggal", { header: "Tanggal", cell: (c) => formatTanggal(c.getValue()) }),
      k.accessor((p) => keKe.get(p.pinjamanId) ?? 0, {
        id: "ke",
        header: "Pinjaman",
        cell: (c) => `ke-${c.getValue()}`,
      }),
      k.accessor("kategori", {
        header: "Peristiwa",
        cell: (c) => {
          const p = c.row.original;
          return p.kategori === "libur" ? (
            <span className="text-muted-foreground">
              Libur{p.alasanLibur ? ` · ${p.alasanLibur}` : ""}
            </span>
          ) : (
            LABEL_PERISTIWA[p.kategori]
          );
        },
      }),
      k.accessor("storting", {
        header: "Storting",
        meta: { kanan: true },
        cell: (c) => (c.row.original.kategori === "libur" ? "—" : rupiah(c.getValue())),
      }),
      k.accessor("saldoSesudah", {
        header: "Saldo sesudah",
        meta: { kanan: true },
        cell: (c) => {
          const n = c.getValue();
          return n === null ? "—" : rupiah(n);
        },
      }),
      k.accessor((p) => p.pencatat.nama, { id: "pencatat", header: "Dicatat" }),
      k.display({
        id: "aksi",
        header: "",
        cell: (c) => {
          const p = c.row.original;
          if (p.kategori !== "libur" || p.tanggal !== hariIni) return null;
          return (
            <div className="flex justify-end">
              <Button
                size="icon"
                variant="ghost"
                title="Hapus tanda libur"
                aria-label="Hapus tanda libur"
                className="text-red-700 hover:text-red-800"
                onClick={() => setHapus(p)}
              >
                <Trash2 />
              </Button>
            </div>
          );
        },
      }),
    ] as Kolom<Peristiwa>[];
  }, [keKe, hariIni]);

  if (q.isPending) return <Memuat />;
  if (q.isError) return <GalatMuat galat={q.error} ulangi={() => void q.refetch()} />;
  return (
    <>
      <TabelData
        kolom={kolom}
        data={[...q.data.peristiwa].reverse()}
        idBaris={(p) => p.id}
        kosong="Belum ada setoran atau libur"
      />
      {hapus ? <DialogHapusLibur libur={hapus} tutup={() => setHapus(null)} /> : null}
    </>
  );
}
