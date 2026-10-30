import { useMutation, useQueryClient } from "@tanstack/react-query";
import { DialogFormulir } from "@/komponen/dialog-formulir";
import { ambil, api } from "@/lib/api";
import type { Karyawan } from "../data";

export function DialogAktifkan({ orang, tutup }: { orang: Karyawan; tutup: () => void }) {
  const klien = useQueryClient();
  const kirim = useMutation({
    mutationFn: () =>
      ambil(() => api.identitas.pengguna[":id"].aktifkan.$post({ param: { id: orang.id } })),
    onSuccess: () => {
      void klien.invalidateQueries({ queryKey: ["pengguna"] });
      tutup();
    },
  });
  return (
    <DialogFormulir
      judul={`Aktifkan ${orang.nama}?`}
      keterangan="Sesudah aktif, HP-nya perlu ditautkan ulang lewat menu Tautkan HP (pilih akun lama)."
      buka
      ubahBuka={(b) => !b && tutup()}
      kirim={() => kirim.mutate()}
      memuat={kirim.isPending}
      galat={kirim.error?.message}
      labelKirim="Aktifkan"
    />
  );
}
