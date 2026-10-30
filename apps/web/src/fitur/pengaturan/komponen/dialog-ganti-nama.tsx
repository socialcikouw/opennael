import { kunciWilayah, rapikanNamaWilayah } from "@opennael/domain";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { DialogFormulir } from "@/komponen/dialog-formulir";
import { Isian } from "@/komponen/formulir";
import { ambil, api } from "@/lib/api";
import { type Kampung, useSegarkanKampung } from "../data";

export function DialogGantiNama({
  w,
  semua,
  tutup,
}: {
  w: Kampung;
  semua: Kampung[];
  tutup: () => void;
}) {
  const segarkan = useSegarkanKampung();
  const [nama, setNama] = useState(w.nama);
  const rapi = rapikanNamaWilayah(nama);
  // Sama dengan pemeriksaan server: kunci sudah dipakai kampung lain → gabung.
  const tujuan = semua.find((x) => x.id !== w.id && x.kunci === kunciWilayah(rapi));
  const m = useMutation({
    mutationFn: () =>
      ambil(() => api.kantor.wilayah["ganti-nama"].$post({ json: { dari: w.id, ke: rapi } })),
    onSuccess: () => {
      segarkan();
      tutup();
    },
  });
  return (
    <DialogFormulir
      judul={`Ganti nama ${w.nama}`}
      keterangan="Nasabah dan rute yang memakai kampung ini ikut berganti nama."
      buka
      ubahBuka={(b) => !b && tutup()}
      kirim={() => m.mutate()}
      memuat={m.isPending}
      galat={m.error?.message}
      labelKirim={tujuan ? `Gabung ke ${tujuan.nama}` : "Simpan"}
      bahaya={!!tujuan}
      bisaKirim={rapi !== "" && rapi !== w.nama}
    >
      <Isian
        label="Nama baru"
        value={nama}
        maxLength={50}
        autoFocus
        onChange={(e) => setNama(e.target.value)}
      />
      {tujuan ? (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Nama ini sudah dipakai kampung <b>{tujuan.nama}</b>. {w.nama} akan digabung ke sana:{" "}
          {w.nasabahTotal} nasabah dan {w.dipakaiRute} rute pindah, lalu {w.nama} dihapus.
        </p>
      ) : null}
    </DialogFormulir>
  );
}
