import { kunciWilayah } from "@opennael/domain";
import { waktu } from "@opennael/format";
import { useQuery } from "@tanstack/react-query";
import { Pencil, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { GalatMuat, Memuat } from "@/komponen/halaman";
import { type Kolom, pembantuKolom, TabelData } from "@/komponen/tabel-data";
import { Button } from "@/komponen/ui/button";
import { Input } from "@/komponen/ui/input";
import { useKantor } from "@/lib/kantor";
import { ambilKampung, type Kampung } from "../data";
import { Bagian } from "./bagian";
import { DialogGantiNama } from "./dialog-ganti-nama";
import { DialogHapusKampung } from "./dialog-hapus-kampung";

export function DaftarKampung() {
  const kantor = useKantor();
  const [baru, setBaru] = useState(false);
  const [cari, setCari] = useState("");
  const [aksi, setAksi] = useState<{ jenis: "ganti" | "hapus"; w: Kampung } | null>(null);
  const q = useQuery({ queryKey: ["wilayah", baru], queryFn: () => ambilKampung(baru) });
  const data = (q.data ?? []).filter((w) => w.kunci.includes(kunciWilayah(cari)));

  const kolom = useMemo(() => {
    const k = pembantuKolom<Kampung>();
    return [
      k.accessor("nama", {
        header: "Kampung",
        cell: (c) => <span className="font-medium">{c.getValue()}</span>,
      }),
      k.accessor("nasabahTotal", {
        header: "Nasabah",
        meta: { kanan: true },
        cell: (c) => `${c.row.original.nasabahAktif} aktif / ${c.getValue()}`,
      }),
      k.accessor("dipakaiRute", { header: "Rute", meta: { kanan: true } }),
      k.accessor("dibuatAt", {
        header: "Muncul",
        cell: (c) => (
          <span className="text-muted-foreground">
            {c.row.original.dibuatOleh.nama} · {waktu(c.getValue(), kantor.zonaWaktu)}
          </span>
        ),
      }),
      k.display({
        id: "aksi",
        header: "",
        cell: (c) => {
          const w = c.row.original;
          const kosong = w.nasabahTotal === 0 && w.dipakaiRute === 0;
          return (
            <div className="flex justify-end gap-1">
              <Button
                size="icon"
                variant="ghost"
                title="Ganti nama / gabung"
                aria-label={`Ganti nama ${w.nama}`}
                onClick={() => setAksi({ jenis: "ganti", w })}
              >
                <Pencil />
              </Button>
              {kosong ? (
                <Button
                  size="icon"
                  variant="ghost"
                  title="Hapus kampung kosong"
                  aria-label={`Hapus ${w.nama}`}
                  className="text-red-700 hover:text-red-800"
                  onClick={() => setAksi({ jenis: "hapus", w })}
                >
                  <Trash2 />
                </Button>
              ) : null}
            </div>
          );
        },
      }),
    ] as Kolom<Kampung>[];
  }, [kantor.zonaWaktu]);

  return (
    <Bagian
      judul="Kampung"
      keterangan="Kampung baru muncul dari formulir nasabah. Betulkan salah ketik dengan ganti nama — bila namanya sama dengan kampung lain, keduanya digabung."
    >
      <div className="flex flex-wrap items-center gap-3">
        <Input
          type="search"
          className="w-60"
          placeholder="Cari kampung…"
          value={cari}
          maxLength={50}
          onChange={(e) => setCari(e.target.value)}
        />
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="size-4 accent-primary"
            checked={baru}
            onChange={(e) => setBaru(e.target.checked)}
          />
          Hanya yang muncul 7 hari terakhir
        </label>
      </div>
      {q.isPending ? (
        <Memuat />
      ) : q.isError ? (
        <GalatMuat galat={q.error} ulangi={() => void q.refetch()} />
      ) : (
        <TabelData
          kolom={kolom}
          data={data}
          idBaris={(w) => w.id}
          kosong={baru ? "Tidak ada kampung baru 7 hari terakhir" : "Belum ada kampung"}
        />
      )}
      {aksi?.jenis === "ganti" ? (
        <DialogGantiNama w={aksi.w} semua={q.data ?? []} tutup={() => setAksi(null)} />
      ) : null}
      {aksi?.jenis === "hapus" ? (
        <DialogHapusKampung w={aksi.w} tutup={() => setAksi(null)} />
      ) : null}
    </Bagian>
  );
}
