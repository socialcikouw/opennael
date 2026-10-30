import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { DialogFormulir } from "@/komponen/dialog-formulir";
import { Medan } from "@/komponen/formulir";
import { Textarea } from "@/komponen/ui/textarea";
import { ambil, api } from "@/lib/api";
import type { Karyawan } from "../data";

export function DialogNonaktifkan({ orang, tutup }: { orang: Karyawan; tutup: () => void }) {
  const klien = useQueryClient();
  const [alasan, setAlasan] = useState("");
  const kirim = useMutation({
    mutationFn: () =>
      ambil(() =>
        api.identitas.pengguna[":id"].nonaktifkan.$post({
          param: { id: orang.id },
          json: { alasan: alasan.trim() },
        }),
      ),
    onSuccess: () => {
      void klien.invalidateQueries({ queryKey: ["pengguna"] });
      tutup();
    },
  });
  return (
    <DialogFormulir
      judul={`Nonaktifkan ${orang.nama}?`}
      keterangan={
        orang.perangkatAktif > 0
          ? `${orang.perangkatAktif} HP yang tertaut langsung terputus. Kolektor yang masih memegang nasabah berpinjaman harus dipindahkan dulu.`
          : "Akun tidak bisa dipakai sampai diaktifkan lagi."
      }
      buka
      ubahBuka={(b) => !b && tutup()}
      kirim={() => kirim.mutate()}
      memuat={kirim.isPending}
      galat={kirim.error?.message}
      labelKirim="Nonaktifkan"
      bahaya
      bisaKirim={alasan.trim() !== ""}
    >
      <Medan label="Alasan">
        <Textarea
          value={alasan}
          maxLength={200}
          required
          onChange={(e) => setAlasan(e.target.value)}
        />
      </Medan>
    </DialogFormulir>
  );
}
