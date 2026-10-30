import { rupiah } from "@opennael/format";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { DialogFormulir } from "@/komponen/dialog-formulir";
import { Medan } from "@/komponen/formulir";
import { IsianRupiah } from "@/komponen/isian-rupiah";
import { Textarea } from "@/komponen/ui/textarea";
import { ambil, api } from "@/lib/api";
import { useSegarkanNasabah } from "../data";
import type { Nasabah } from "../inti";

export function DialogKoreksiTabungan({ n, tutup }: { n: Nasabah; tutup: () => void }) {
  const segarkan = useSegarkanNasabah();
  const saldo = n.saldoTabungan ?? 0;
  const [saldoBaru, setSaldoBaru] = useState<number | null>(saldo);
  const [alasan, setAlasan] = useState("");
  const kirim = useMutation({
    mutationFn: () =>
      ambil(() =>
        api.pembiayaan.nasabah[":id"]["koreksi-tabungan"].$post({
          param: { id: n.id },
          json: { saldoBaru: saldoBaru ?? 0, saldoSebelum: saldo, alasan: alasan.trim() },
        }),
      ),
    onSuccess: () => {
      segarkan();
      tutup();
    },
  });
  const selisih = (saldoBaru ?? 0) - saldo;
  return (
    <DialogFormulir
      judul={`Koreksi tabungan ${n.nama}`}
      keterangan="Membetulkan angka tabungan yang salah catat — tanpa uang keluar/masuk."
      buka
      ubahBuka={(b) => !b && tutup()}
      kirim={() => kirim.mutate()}
      memuat={kirim.isPending}
      galat={kirim.error?.message}
      labelKirim="Simpan koreksi"
      bisaKirim={saldoBaru !== null && selisih !== 0 && alasan.trim() !== ""}
    >
      <IsianRupiah
        label="Tabungan yang benar"
        nilai={saldoBaru}
        ubah={setSaldoBaru}
        petunjuk={`Sekarang ${rupiah(saldo)} · selisih ${selisih > 0 ? "+" : ""}${rupiah(selisih)}`}
      />
      <Medan label="Alasan">
        <Textarea value={alasan} maxLength={200} onChange={(e) => setAlasan(e.target.value)} />
      </Medan>
    </DialogFormulir>
  );
}
