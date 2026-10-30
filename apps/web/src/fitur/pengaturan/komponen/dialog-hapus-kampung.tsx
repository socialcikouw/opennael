import { useMutation } from "@tanstack/react-query";
import { DialogFormulir } from "@/komponen/dialog-formulir";
import { ambil, api } from "@/lib/api";
import { type Kampung, useSegarkanKampung } from "../data";

export function DialogHapusKampung({ w, tutup }: { w: Kampung; tutup: () => void }) {
  const segarkan = useSegarkanKampung();
  const m = useMutation({
    mutationFn: () => ambil(() => api.kantor.wilayah[":id"].$delete({ param: { id: w.id } })),
    onSuccess: () => {
      segarkan();
      tutup();
    },
  });
  return (
    <DialogFormulir
      judul={`Hapus kampung ${w.nama}?`}
      keterangan="Kampung ini tidak dipakai nasabah maupun rute. Penghapusan tercatat di aktivitas."
      buka
      ubahBuka={(b) => !b && tutup()}
      kirim={() => m.mutate()}
      memuat={m.isPending}
      galat={m.error?.message}
      labelKirim="Hapus"
      bahaya
    />
  );
}
