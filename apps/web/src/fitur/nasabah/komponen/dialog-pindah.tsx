import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { DialogFormulir } from "@/komponen/dialog-formulir";
import { Medan, PilihanAsli } from "@/komponen/formulir";
import { ambil, api } from "@/lib/api";
import { useSegarkanNasabah } from "../data";
import type { Kolektor, Nasabah } from "../inti";

export function DialogPindah({
  n,
  kolektor,
  tutup,
}: {
  n: Nasabah;
  kolektor: Kolektor[];
  tutup: () => void;
}) {
  const segarkan = useSegarkanNasabah();
  const pilihan = kolektor.filter((k) => k.id !== n.kolektor?.id);
  const [ke, setKe] = useState(pilihan[0]?.id ?? "");
  const kirim = useMutation({
    mutationFn: () =>
      ambil(() =>
        api.pembiayaan.nasabah[":id"].pindah.$post({
          param: { id: n.id },
          json: { kolektorId: ke },
        }),
      ),
    onSuccess: () => {
      segarkan();
      tutup();
    },
  });
  return (
    <DialogFormulir
      judul={`Pindah pemegang ${n.nama}`}
      keterangan={`Sekarang dipegang ${n.kolektor?.nama ?? "—"}. Pinjaman aktifnya ikut pindah.`}
      buka
      ubahBuka={(b) => !b && tutup()}
      kirim={() => kirim.mutate()}
      memuat={kirim.isPending}
      galat={kirim.error?.message}
      labelKirim="Pindahkan"
      bisaKirim={ke !== ""}
    >
      <Medan label="Kolektor baru">
        <PilihanAsli value={ke} onChange={(e) => setKe(e.target.value)}>
          {pilihan.length === 0 ? <option value="">Tidak ada kolektor lain</option> : null}
          {pilihan.map((k) => (
            <option key={k.id} value={k.id}>
              {k.nama}
            </option>
          ))}
        </PilihanAsli>
      </Medan>
    </DialogFormulir>
  );
}
