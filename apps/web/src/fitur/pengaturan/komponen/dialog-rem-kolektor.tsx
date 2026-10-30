import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { DialogFormulir } from "@/komponen/dialog-formulir";
import { Medan, PilihanAsli } from "@/komponen/formulir";
import { ambil, api } from "@/lib/api";
import { type IsiRem, keInput } from "../inti";
import { SaklarRem } from "./saklar-rem";

export function DialogRemKolektor({
  kolektor,
  aktif,
  tutup,
}: {
  kolektor: { id: string; nama: string }[];
  aktif: { id: string; isi: IsiRem }[];
  tutup: () => void;
}) {
  const klien = useQueryClient();
  const [kolektorId, setKolektorId] = useState(kolektor[0]?.id ?? "");
  const kosong: IsiRem = { baru: false, naik: false, gulung: false, alasan: "" };
  const [isi, setIsi] = useState<IsiRem | null>(null);
  const nilai = isi ?? aktif.find((a) => a.id === kolektorId)?.isi ?? kosong;
  const m = useMutation({
    mutationFn: () =>
      ambil(() =>
        api.kantor.kebijakan.kolektor[":kolektorId"].$put({
          param: { kolektorId },
          json: keInput(nilai),
        }),
      ),
    onSuccess: () => {
      void klien.invalidateQueries({ queryKey: ["kebijakan"] });
      tutup();
    },
  });
  return (
    <DialogFormulir
      judul="Rem kolektor"
      keterangan="Berlaku untuk satu kolektor, di atas rem kantor. Semua saklar mati = rem dilepas."
      buka
      ubahBuka={(b) => !b && tutup()}
      kirim={() => m.mutate()}
      memuat={m.isPending}
      galat={m.error?.message}
      bisaKirim={kolektorId !== ""}
    >
      <Medan label="Kolektor">
        <PilihanAsli
          value={kolektorId}
          onChange={(e) => {
            setKolektorId(e.target.value);
            setIsi(null);
          }}
        >
          {kolektor.map((k) => (
            <option key={k.id} value={k.id}>
              {k.nama}
            </option>
          ))}
        </PilihanAsli>
      </Medan>
      <SaklarRem isi={nilai} ubah={setIsi} />
    </DialogFormulir>
  );
}
