import type { HariKas } from "@opennael/contracts";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { DialogFormulir } from "@/komponen/dialog-formulir";
import { IsianRupiah } from "@/komponen/isian-rupiah";
import { ambil, api } from "@/lib/api";
import { RincianKas } from "./rincian-kas";

// ---- setoran sore -------------------------------------------------------------------

/** Hitung buta: bos/kasir mengetik uang yang dihitung, baru sesudahnya melihat rincian. */
export function DialogTerimaKas({ hari, tutup }: { hari: HariKas; tutup: () => void }) {
  const klien = useQueryClient();
  const [tunai, setTunai] = useState<number | null>(null);
  const m = useMutation({
    mutationFn: () =>
      ambil(() =>
        api.hariKolektor["hari-kolektor"][":kolektorId"]["terima-kas"].$post({
          param: { kolektorId: hari.kolektor.id },
          json: { tunaiDiterima: tunai ?? 0 },
        }),
      ),
    onSuccess: () => {
      for (const k of [["harian"], ["ringkasan"], ["aktivitas"]]) {
        void klien.invalidateQueries({ queryKey: k });
      }
    },
  });
  const st = m.data?.serahTerima;
  if (m.data && st) {
    return (
      <DialogFormulir
        judul={`Kas ${hari.kolektor.nama} diterima`}
        buka
        ubahBuka={(b) => !b && tutup()}
        kirim={tutup}
        memuat={false}
        labelKirim="Selesai"
      >
        <RincianKas hari={m.data} />
      </DialogFormulir>
    );
  }
  return (
    <DialogFormulir
      judul={`Terima kas ${hari.kolektor.nama}`}
      keterangan="Hitung uang fisiknya lebih dulu, lalu ketik jumlahnya. Angka seharusnya baru tampil sesudah disimpan."
      buka
      ubahBuka={(b) => !b && tutup()}
      kirim={() => m.mutate()}
      memuat={m.isPending}
      galat={m.error?.message}
      labelKirim="Simpan uang diterima"
      bisaKirim={tunai !== null}
    >
      <IsianRupiah label="Uang diterima" nilai={tunai} ubah={setTunai} autoFocus />
    </DialogFormulir>
  );
}
