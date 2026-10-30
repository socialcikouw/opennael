import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { DialogFormulir } from "@/komponen/dialog-formulir";
import { Isian, Medan, PilihanAsli } from "@/komponen/formulir";
import { IsianRupiah } from "@/komponen/isian-rupiah";
import { ambil, api } from "@/lib/api";

export function DialogBiaya({
  kolektor,
  tutup,
}: {
  kolektor: { id: string; nama: string }[];
  tutup: () => void;
}) {
  const klien = useQueryClient();
  const [isi, setIsi] = useState({ kolektorId: kolektor[0]?.id ?? "", keterangan: "" });
  const [nominal, setNominal] = useState<number | null>(null);
  const m = useMutation({
    mutationFn: () =>
      ambil(() =>
        api.hariKolektor["biaya-tak-terduga"].$post({
          json: { ...isi, keterangan: isi.keterangan.trim(), nominal: nominal ?? 0 },
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
      judul="Catat biaya tak terduga"
      keterangan="Uang kolektor yang terpakai di lapangan hari ini (mis. ban bocor) — mengurangi tunai seharusnya."
      buka
      ubahBuka={(b) => !b && tutup()}
      kirim={() => m.mutate()}
      memuat={m.isPending}
      galat={m.error?.message}
      labelKirim="Catat"
      bisaKirim={!!nominal && isi.kolektorId !== "" && isi.keterangan.trim() !== ""}
    >
      <Medan label="Kolektor">
        <PilihanAsli
          value={isi.kolektorId}
          onChange={(e) => setIsi({ ...isi, kolektorId: e.target.value })}
        >
          {kolektor.map((o) => (
            <option key={o.id} value={o.id}>
              {o.nama}
            </option>
          ))}
        </PilihanAsli>
      </Medan>
      <IsianRupiah label="Nominal" nilai={nominal} ubah={setNominal} />
      <Isian
        label="Keterangan"
        value={isi.keterangan}
        maxLength={100}
        onChange={(e) => setIsi({ ...isi, keterangan: e.target.value })}
      />
    </DialogFormulir>
  );
}
