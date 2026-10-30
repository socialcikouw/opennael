import type { HariKas } from "@opennael/contracts";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { DialogFormulir } from "@/komponen/dialog-formulir";
import { IsianRupiah } from "@/komponen/isian-rupiah";
import { ambil, api } from "@/lib/api";

/** Pembetulan angka pagi kolektor (bos, hari ini, sebelum kas diterima). */
export function DialogUbahHariIni({ hari, tutup }: { hari: HariKas; tutup: () => void }) {
  const klien = useQueryClient();
  const [kas, setKas] = useState<number | null>(hari.kasLapangan);
  const [jalan, setJalan] = useState<number | null>(hari.uangJalan);
  const ubah = {
    ...(kas !== null && kas !== hari.kasLapangan ? { kasLapangan: kas } : {}),
    ...(jalan !== null && jalan !== hari.uangJalan ? { uangJalan: jalan } : {}),
  };
  const m = useMutation({
    mutationFn: () =>
      ambil(() =>
        api.hariKolektor["hari-kolektor"][":kolektorId"]["hari-ini"].$patch({
          param: { kolektorId: hari.kolektor.id },
          json: ubah,
        }),
      ),
    onSuccess: () => {
      for (const k of [["harian"], ["ringkasan"], ["aktivitas"]]) {
        void klien.invalidateQueries({ queryKey: k });
      }
      tutup();
    },
  });
  return (
    <DialogFormulir
      judul={`Betulkan angka pagi ${hari.kolektor.nama}`}
      keterangan="Kas lapangan dan uang jalan yang diisi kolektor saat absen. Hanya sebelum kasnya diterima; tercatat di aktivitas."
      buka
      ubahBuka={(b) => !b && tutup()}
      kirim={() => m.mutate()}
      memuat={m.isPending}
      galat={m.error?.message}
      bisaKirim={Object.keys(ubah).length > 0}
    >
      <IsianRupiah label="Kas lapangan" nilai={kas} ubah={setKas} autoFocus />
      <IsianRupiah label="Uang jalan" nilai={jalan} ubah={setJalan} />
    </DialogFormulir>
  );
}
