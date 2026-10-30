import { tanggal as formatTanggal, persen, rupiah } from "@opennael/format";
import { useQuery } from "@tanstack/react-query";
import { Banknote } from "lucide-react";
import { useState } from "react";
import { GalatMuat, KartuAngka, Memuat } from "@/komponen/halaman";
import { type Kolom, pembantuKolom, TabelData } from "@/komponen/tabel-data";
import { Button } from "@/komponen/ui/button";
import { ambilPratinjau, type HariGaji } from "../data";
import { DialogBayar } from "./dialog-bayar";

const HALANGAN = {
  PERIODE_BELUM_BERAKHIR: "Periode belum berakhir — gaji dibayar sesudah hari terakhirnya lewat.",
  PERIODE_SUDAH_DIBAYAR: "Sebagian periode ini sudah dibayar.",
  TEKOR_MELEBIHI_GAJI: "Tekor melebihi gaji kotor — gaji bersih minus.",
  GAJI_KOTOR_MINUS: "Gaji kotor minus.",
} as const;

const kh = pembantuKolom<HariGaji>();

const KOLOM_HARI = [
  kh.accessor("tanggal", {
    header: "Tanggal",
    cell: (c) => formatTanggal(c.getValue()),
    footer: () => "Jumlah",
  }),
  kh.accessor("storting", {
    header: "Storting",
    meta: { kanan: true },
    cell: (c) => rupiah(c.getValue()),
    footer: (c) => rupiah(c.table.getRowModel().rows.reduce((s, r) => s + r.original.storting, 0)),
  }),
  kh.accessor("tarifBp", {
    header: "Tarif",
    meta: { kanan: true },
    cell: (c) => persen(c.getValue() / 100),
  }),
  kh.accessor((h) => Math.round((h.storting * h.tarifBp) / 10_000), {
    id: "gaji",
    header: "Gaji hari itu",
    meta: { kanan: true },
    cell: (c) => rupiah(c.getValue()),
  }),
  kh.accessor("tekor", {
    header: "Tekor",
    meta: { kanan: true },
    cell: (c) =>
      c.getValue() ? <span className="text-red-700">{rupiah(c.getValue())}</span> : "—",
    footer: (c) => rupiah(c.table.getRowModel().rows.reduce((s, r) => s + r.original.tekor, 0)),
  }),
] as Kolom<HariGaji>[];

export function PratinjauGaji({
  kolektorId,
  mulai,
  selesai,
}: {
  kolektorId: string;
  mulai: string;
  selesai: string;
}) {
  const [bayar, setBayar] = useState(false);
  const q = useQuery({
    queryKey: ["gaji", "pratinjau", kolektorId, mulai, selesai],
    queryFn: () => ambilPratinjau(kolektorId, mulai, selesai),
  });
  if (q.isPending) return <Memuat teks="Menghitung gaji…" />;
  if (q.isError) return <GalatMuat galat={q.error} ulangi={() => void q.refetch()} />;
  const p = q.data;
  return (
    <div className="space-y-4">
      <section className="grid grid-cols-3 gap-3">
        <KartuAngka label="Gaji kotor" nilai={rupiah(p.gajiKotor)} />
        <KartuAngka
          label="Potongan tekor"
          nilai={rupiah(p.potonganTekor)}
          nada={p.potonganTekor > 0 ? "buruk" : undefined}
        />
        <KartuAngka label="Gaji bersih" nilai={rupiah(p.gajiBersih)} />
      </section>
      <TabelData
        kolom={KOLOM_HARI}
        data={p.hari}
        idBaris={(h) => h.tanggal}
        kosong="Tidak ada storting atau tekor pada periode ini"
      />
      {p.halangan ? (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {HALANGAN[p.halangan]}
        </p>
      ) : (
        <Button onClick={() => setBayar(true)}>
          <Banknote />
          Bayar gaji {rupiah(p.gajiBersih)}
        </Button>
      )}
      {bayar ? <DialogBayar p={p} tutup={() => setBayar(false)} /> : null}
    </div>
  );
}
