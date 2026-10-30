import { rupiah } from "@opennael/format";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { DialogFormulir } from "@/komponen/dialog-formulir";
import { IsianRupiah } from "@/komponen/isian-rupiah";
import { ambil, api } from "@/lib/api";
import type { Transaksi } from "../data";

export function DialogTransfer({ t, tutup }: { t: Transaksi; tutup: () => void }) {
  const klien = useQueryClient();
  const [nominal, setNominal] = useState<number | null>(t.batasTransfer);
  const m = useMutation({
    mutationFn: () =>
      ambil(() =>
        api.hariKolektor["transfer-setoran"].$post({
          json: { transaksiId: t.id, nominal: nominal ?? 0 },
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
      judul={`Transfer setoran ${t.nasabah.nama}`}
      keterangan={`Setoran ini dibayar lewat transfer, bukan tunai. Paling banyak ${rupiah(t.batasTransfer)}.`}
      buka
      ubahBuka={(b) => !b && tutup()}
      kirim={() => m.mutate()}
      memuat={m.isPending}
      galat={m.error?.message}
      labelKirim="Catat transfer"
      bisaKirim={!!nominal && nominal <= t.batasTransfer}
    >
      <IsianRupiah label="Nominal transfer" nilai={nominal} ubah={setNominal} />
    </DialogFormulir>
  );
}
