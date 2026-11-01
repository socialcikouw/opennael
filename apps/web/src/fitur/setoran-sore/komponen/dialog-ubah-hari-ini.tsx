import { kunci } from "@opennael/api-client";
import type { HariKas } from "@opennael/contracts";
import { kasPagiSah } from "@opennael/domain";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { DialogFormulir } from "@/komponen/dialog-formulir";
import { IsianRupiah } from "@/komponen/isian-rupiah";
import { ambil, api } from "@/lib/api";

const ATURAN = "Wajib · minimal Rp 5.000 · kelipatan Rp 5.000";

/** Petunjuk di bawah isian: aturannya, merah bila nilainya belum sah (aturan-usaha I0). */
function Petunjuk({ sah }: { sah: boolean }) {
  return <span className={sah ? undefined : "text-destructive"}>{ATURAN}</span>;
}

/**
 * Pembetulan angka pagi kolektor (bos, hari ini, sebelum kas diterima). Kas
 * lapangan & uang jalan wajib, minimal Rp 5.000 dan kelipatan Rp 5.000 —
 * keduanya, karena database memeriksa seluruh baris yang diubah.
 */
export function DialogUbahHariIni({ hari, tutup }: { hari: HariKas; tutup: () => void }) {
  const klien = useQueryClient();
  const [kas, setKas] = useState<number | null>(hari.kasLapangan);
  const [jalan, setJalan] = useState<number | null>(hari.uangJalan);
  const kasSah = kas !== null && kasPagiSah(kas);
  const jalanSah = jalan !== null && kasPagiSah(jalan);
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
      for (const k of [kunci.harian, kunci.ringkasan, kunci.aktivitas]) {
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
      bisaKirim={Object.keys(ubah).length > 0 && kasSah && jalanSah}
    >
      <IsianRupiah
        label="Kas lapangan"
        nilai={kas}
        ubah={setKas}
        autoFocus
        petunjuk={<Petunjuk sah={kasSah} />}
      />
      <IsianRupiah
        label="Uang jalan"
        nilai={jalan}
        ubah={setJalan}
        petunjuk={<Petunjuk sah={jalanSah} />}
      />
    </DialogFormulir>
  );
}
