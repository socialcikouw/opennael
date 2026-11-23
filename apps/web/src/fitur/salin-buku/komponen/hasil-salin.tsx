import { LABEL_JENIS, rupiah } from "@opennael/format";
import { PesanGalat } from "@/komponen/formulir";
import type { FormulirSalin } from "../data";

/** Pratinjau angka, galat, dan ringkasan salinan terakhir. */
export function HasilSalin({ f }: { f: FormulirSalin }) {
  const { hitung, jenis, tenor, m, terakhir } = f;
  return (
    <>
      {hitung?.ok ? (
        <p className="rounded-md bg-muted px-3 py-2 text-sm">
          Total kembali <strong>{rupiah(hitung.ok.totalKembali)}</strong> · angsuran{" "}
          <strong>{rupiah(hitung.ok.angsuran)}</strong> · sudah{" "}
          <strong>{hitung.ok.angsuranKe}</strong> angsuran terbayar
          {jenis === "tempoan" ? "" : ` dari ${tenor}`}
        </p>
      ) : hitung?.galat ? (
        <PesanGalat pesan={hitung.galat} />
      ) : null}
      <PesanGalat pesan={m.error?.message} />
      {terakhir && !m.error ? (
        <p className="text-sm text-sukses">
          Tersalin: {terakhir.nasabah.nama} — {LABEL_JENIS[terakhir.jenis].toLowerCase()} pinjaman
          ke-{terakhir.pinjamanKe}, saldo {rupiah(terakhir.saldo)}
          {terakhir.status === "macet" ? " (macet)" : ""}.
        </p>
      ) : null}
    </>
  );
}
