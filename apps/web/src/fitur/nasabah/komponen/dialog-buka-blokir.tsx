import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { DialogFormulir } from "@/komponen/dialog-formulir";
import { Medan } from "@/komponen/formulir";
import { Textarea } from "@/komponen/ui/textarea";
import { ambil, api } from "@/lib/api";
import { useSegarkanNasabah } from "../data";
import type { Nasabah } from "../inti";

export function DialogBukaBlokir({ n, tutup }: { n: Nasabah; tutup: () => void }) {
  const segarkan = useSegarkanNasabah();
  const [alasan, setAlasan] = useState("");
  const kirim = useMutation({
    mutationFn: () =>
      ambil(() =>
        api.pembiayaan.nasabah[":id"]["buka-blokir"].$post({
          param: { id: n.id },
          json: { alasan: alasan.trim() },
        }),
      ),
    onSuccess: () => {
      segarkan();
      tutup();
    },
  });
  return (
    <DialogFormulir
      judul={`Buka blokir ${n.nama}?`}
      keterangan="Nasabah boleh meminjam lagi."
      buka
      ubahBuka={(b) => !b && tutup()}
      kirim={() => kirim.mutate()}
      memuat={kirim.isPending}
      galat={kirim.error?.message}
      labelKirim="Buka blokir"
      bisaKirim={alasan.trim() !== ""}
    >
      <Medan label="Alasan">
        <Textarea value={alasan} maxLength={100} onChange={(e) => setAlasan(e.target.value)} />
      </Medan>
    </DialogFormulir>
  );
}
