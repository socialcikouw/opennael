import { rupiah } from "@opennael/format";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { DialogFormulir } from "@/komponen/dialog-formulir";
import { Medan, PilihanAsli } from "@/komponen/formulir";
import { Textarea } from "@/komponen/ui/textarea";
import { ambil, api } from "@/lib/api";
import { useSegarkanNasabah } from "../data";
import type { Nasabah } from "../inti";

const ALASAN_PUTIH = [
  { nilai: "macet_lama", label: "Macet lama" },
  { nilai: "meninggal", label: "Meninggal" },
  { nilai: "lainnya", label: "Lainnya" },
] as const;

export function DialogPutihkan({ n, tutup }: { n: Nasabah; tutup: () => void }) {
  const segarkan = useSegarkanNasabah();
  const [alasan, setAlasan] = useState<(typeof ALASAN_PUTIH)[number]["nilai"]>("macet_lama");
  const [keterangan, setKeterangan] = useState("");
  const p = n.pinjamanAktif;
  const kirim = useMutation({
    mutationFn: () =>
      ambil(() =>
        api.pembiayaan.pinjaman[":id"].putihkan.$post({
          param: { id: p?.id ?? "" },
          json: { alasan, keterangan: keterangan.trim() },
        }),
      ),
    onSuccess: () => {
      segarkan();
      tutup();
    },
  });
  return (
    <DialogFormulir
      judul={`Putihkan pinjaman ${n.nama}?`}
      keterangan={`Piutang ${rupiah(p?.saldo ?? 0)} dihapus tanpa uang masuk; tabungan tidak disentuh dan nasabah diblokir.`}
      buka
      ubahBuka={(b) => !b && tutup()}
      kirim={() => kirim.mutate()}
      memuat={kirim.isPending}
      galat={kirim.error?.message}
      labelKirim="Putihkan"
      bahaya
      bisaKirim={!!p && keterangan.trim() !== ""}
    >
      <Medan label="Alasan">
        <PilihanAsli value={alasan} onChange={(e) => setAlasan(e.target.value as typeof alasan)}>
          {ALASAN_PUTIH.map((a) => (
            <option key={a.nilai} value={a.nilai}>
              {a.label}
            </option>
          ))}
        </PilihanAsli>
      </Medan>
      <Medan label="Keterangan">
        <Textarea
          value={keterangan}
          maxLength={200}
          onChange={(e) => setKeterangan(e.target.value)}
        />
      </Medan>
    </DialogFormulir>
  );
}
