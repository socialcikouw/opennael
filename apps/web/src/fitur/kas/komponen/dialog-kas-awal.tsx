import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { DialogFormulir } from "@/komponen/dialog-formulir";
import { IsianRupiah } from "@/komponen/isian-rupiah";
import { ambil, api } from "@/lib/api";
import { useSegarkanKas } from "../data";

export function DialogKasAwal({
  awal,
  tutup,
}: {
  awal: { tunai: number; bank: number };
  tutup: () => void;
}) {
  const segarkan = useSegarkanKas();
  const [tunai, setTunai] = useState<number | null>(awal.tunai);
  const [bank, setBank] = useState<number | null>(awal.bank);
  const m = useMutation({
    mutationFn: () =>
      ambil(() =>
        api.kas.kas.buka.$patch({
          // Klien `hc` menggabungkan tipe POST & PATCH di jalur yang sama — kirim keduanya.
          json: { tunai: tunai ?? 0, bank: bank ?? 0 },
        }),
      ),
    onSuccess: () => {
      segarkan();
      tutup();
    },
  });
  return (
    <DialogFormulir
      judul="Betulkan kas awal"
      keterangan="Hanya di hari buku kas dibuka."
      buka
      ubahBuka={(b) => !b && tutup()}
      kirim={() => m.mutate()}
      memuat={m.isPending}
      galat={m.error?.message}
      bisaKirim={tunai !== awal.tunai || bank !== awal.bank}
    >
      <IsianRupiah label="Kas awal tunai" nilai={tunai} ubah={setTunai} />
      <IsianRupiah label="Kas awal bank" nilai={bank} ubah={setBank} />
    </DialogFormulir>
  );
}
