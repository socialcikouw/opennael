import { tanggal as formatTanggal, rupiah } from "@opennael/format";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { DialogFormulir } from "@/komponen/dialog-formulir";
import { Isian, Medan, PilihanAsli } from "@/komponen/formulir";
import { ambil, api } from "@/lib/api";
import type { Pratinjau } from "../data";

export function DialogBayar({ p, tutup }: { p: Pratinjau; tutup: () => void }) {
  const klien = useQueryClient();
  const [dariAkun, setDariAkun] = useState<"tunai" | "bank">("tunai");
  const [keterangan, setKeterangan] = useState("");
  const m = useMutation({
    mutationFn: () =>
      ambil(() =>
        api.penggajian.kas.gaji.$post({
          json: {
            kolektorId: p.kolektor.id,
            periodeMulai: p.periodeMulai,
            periodeSelesai: p.periodeSelesai,
            dariAkun,
            ...(keterangan.trim() ? { keterangan: keterangan.trim() } : {}),
          },
        }),
      ),
    onSuccess: () => {
      for (const k of [["gaji"], ["kas"], ["aktivitas"]]) {
        void klien.invalidateQueries({ queryKey: k });
      }
      tutup();
    },
  });
  return (
    <DialogFormulir
      judul={`Bayar gaji ${p.kolektor.nama}`}
      keterangan={`${formatTanggal(p.periodeMulai, "tanpa")} – ${formatTanggal(p.periodeSelesai, "tanpa")} · gaji bersih ${rupiah(p.gajiBersih)}. Angka dihitung ulang & dibekukan server.`}
      buka
      ubahBuka={(b) => !b && tutup()}
      kirim={() => m.mutate()}
      memuat={m.isPending}
      galat={m.error?.message}
      labelKirim={`Bayar ${rupiah(p.gajiBersih)}`}
    >
      <Medan label="Dari akun">
        <PilihanAsli
          value={dariAkun}
          onChange={(e) => setDariAkun(e.target.value as "tunai" | "bank")}
        >
          <option value="tunai">Tunai (brankas)</option>
          <option value="bank">Bank</option>
        </PilihanAsli>
      </Medan>
      <Isian
        label="Keterangan (opsional)"
        value={keterangan}
        maxLength={200}
        onChange={(e) => setKeterangan(e.target.value)}
      />
    </DialogFormulir>
  );
}
