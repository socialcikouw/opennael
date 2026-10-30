import { rupiah } from "@opennael/format";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { DialogFormulir } from "@/komponen/dialog-formulir";
import { Medan, PilihanAsli } from "@/komponen/formulir";
import { IsianRupiah } from "@/komponen/isian-rupiah";
import { Textarea } from "@/komponen/ui/textarea";
import { ambil, api } from "@/lib/api";
import { useSegarkanNasabah } from "../data";
import type { Nasabah } from "../inti";

export function DialogTarikTabungan({ n, tutup }: { n: Nasabah; tutup: () => void }) {
  const segarkan = useSegarkanNasabah();
  const saldo = n.saldoTabungan ?? 0;
  const [nominal, setNominal] = useState<number | null>(null);
  const [dariAkun, setDariAkun] = useState<"tunai" | "bank">("tunai");
  const [alasan, setAlasan] = useState("");
  const kirim = useMutation({
    mutationFn: () =>
      ambil(() =>
        api.pembiayaan.nasabah[":id"]["penarikan-tabungan"].$post({
          param: { id: n.id },
          json: { nominal: nominal ?? 0, dariAkun, saldoSebelum: saldo, alasan: alasan.trim() },
        }),
      ),
    onSuccess: () => {
      segarkan();
      tutup();
    },
  });
  return (
    <DialogFormulir
      judul={`Tarik tabungan ${n.nama}`}
      keterangan={`Tabungan sekarang ${rupiah(saldo)}. Uang keluar dari kas kantor.`}
      buka
      ubahBuka={(b) => !b && tutup()}
      kirim={() => kirim.mutate()}
      memuat={kirim.isPending}
      galat={kirim.error?.message}
      labelKirim="Catat penarikan"
      bisaKirim={!!nominal && nominal <= saldo && alasan.trim() !== ""}
    >
      <IsianRupiah
        label="Nominal"
        nilai={nominal}
        ubah={setNominal}
        petunjuk={nominal && nominal > saldo ? "Melebihi tabungan" : undefined}
      />
      <Medan label="Dari akun">
        <PilihanAsli
          value={dariAkun}
          onChange={(e) => setDariAkun(e.target.value as "tunai" | "bank")}
        >
          <option value="tunai">Tunai</option>
          <option value="bank">Bank</option>
        </PilihanAsli>
      </Medan>
      <Medan label="Alasan">
        <Textarea value={alasan} maxLength={200} onChange={(e) => setAlasan(e.target.value)} />
      </Medan>
    </DialogFormulir>
  );
}
