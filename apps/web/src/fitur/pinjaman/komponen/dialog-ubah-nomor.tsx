import { kunci } from "@opennael/api-client";
import type { RincianPinjaman } from "@opennael/contracts";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { DialogFormulir } from "@/komponen/dialog-formulir";
import { Isian } from "@/komponen/formulir";
import { ambil, api, kueri } from "@/lib/api";

export function DialogUbahNomor({
  p,
  nasabahId,
  tutup,
}: {
  p: RincianPinjaman;
  nasabahId: string;
  tutup: () => void;
}) {
  const klien = useQueryClient();
  const [ke, setKe] = useState(String(p.pinjamanKe));
  const nomor = Number(ke);
  const m = useMutation({
    mutationFn: () =>
      ambil(() =>
        api.pembiayaan.pinjaman[":id"].$patch({ param: { id: p.id }, json: { pinjamanKe: nomor } }),
      ),
    onSuccess: () => {
      void klien.invalidateQueries({ queryKey: kueri.nasabah.buku(nasabahId).queryKey });
      // Rincian ini dan daftar di layar Pinjaman.
      void klien.invalidateQueries({ queryKey: kunci.pinjaman });
      tutup();
    },
  });
  return (
    <DialogFormulir
      judul="Ubah Nomor Pinjaman"
      keterangan="Samakan dengan buku lama bila salah urut. Nomor yang sudah dipakai pinjaman lain nasabah ini ditolak."
      buka
      ubahBuka={(b) => !b && tutup()}
      kirim={() => m.mutate()}
      memuat={m.isPending}
      galat={m.error?.message}
      bisaKirim={Number.isInteger(nomor) && nomor >= 1 && nomor !== p.pinjamanKe}
    >
      <Isian
        label="Pinjaman ke-"
        type="number"
        min={1}
        value={ke}
        autoFocus
        onChange={(e) => setKe(e.target.value)}
      />
    </DialogFormulir>
  );
}
