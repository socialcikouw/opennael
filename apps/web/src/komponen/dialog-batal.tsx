import { kunci } from "@opennael/api-client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { type ReactNode, useState } from "react";
import { DialogFormulir } from "@/komponen/dialog-formulir";
import { Medan } from "@/komponen/formulir";
import { Textarea } from "@/komponen/ui/textarea";

/**
 * DIALOG BATAL — semua pembatalan uang oleh bos (aturan-usaha L1): alasan
 * wajib, hanya hari yang sama. Sesudah berhasil, kueri `segarkan` dimuat ulang.
 */
export function DialogBatal({
  judul,
  keterangan,
  kirim,
  tutup,
  segarkan,
}: {
  judul: string;
  keterangan?: ReactNode;
  kirim: (alasan: string) => Promise<unknown>;
  tutup: () => void;
  /** Awalan kunci kueri yang terdampak. */
  segarkan: readonly (readonly string[])[];
}) {
  const klien = useQueryClient();
  const [alasan, setAlasan] = useState("");
  const m = useMutation({
    mutationFn: () => kirim(alasan.trim()),
    onSuccess: () => {
      for (const k of [...segarkan, kunci.aktivitas, kunci.ringkasan]) {
        void klien.invalidateQueries({ queryKey: k });
      }
      tutup();
    },
  });
  return (
    <DialogFormulir
      judul={judul}
      keterangan={
        keterangan ?? "Pembatalan hanya bisa di hari yang sama dan tercatat di aktivitas."
      }
      buka
      ubahBuka={(b) => !b && tutup()}
      kirim={() => m.mutate()}
      memuat={m.isPending}
      galat={m.error?.message}
      labelKirim="Batalkan"
      bahaya
      bisaKirim={alasan.trim() !== ""}
    >
      <Medan label="Alasan pembatalan">
        <Textarea
          value={alasan}
          maxLength={100}
          autoFocus
          onChange={(e) => setAlasan(e.target.value)}
        />
      </Medan>
    </DialogFormulir>
  );
}
