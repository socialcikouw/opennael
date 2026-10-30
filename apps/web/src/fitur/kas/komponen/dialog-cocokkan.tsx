import { rupiah } from "@opennael/format";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { DialogFormulir } from "@/komponen/dialog-formulir";
import { Isian, Medan, PilihanAsli } from "@/komponen/formulir";
import { IsianRupiah } from "@/komponen/isian-rupiah";
import { ambil, api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useSegarkanKas } from "../data";
import type { Akun } from "../inti";
import { Baris } from "./baris";

// ---- pencocokan ---------------------------------------------------------------------

/** Hitung buta: angka nyata dulu; saldo buku dijawab server sesudah tersimpan. */
export function DialogCocokkan({ tutup }: { tutup: () => void }) {
  const segarkan = useSegarkanKas();
  const [akun, setAkun] = useState<Akun>("tunai");
  const [nyata, setNyata] = useState<number | null>(null);
  const [keterangan, setKeterangan] = useState("");
  const m = useMutation({
    mutationFn: () =>
      ambil(() =>
        api.kas.kas.pencocokan.$post({
          json: {
            akun,
            saldoNyata: nyata ?? 0,
            ...(keterangan.trim() ? { keterangan: keterangan.trim() } : {}),
          },
        }),
      ),
    onSuccess: segarkan,
  });
  if (m.data) {
    const h = m.data;
    return (
      <DialogFormulir
        judul={`Hasil pencocokan ${h.akun}`}
        buka
        ubahBuka={(b) => !b && tutup()}
        kirim={tutup}
        memuat={false}
        labelKirim="Selesai"
      >
        <div className="divide-y">
          <Baris label="Saldo nyata (dihitung)">{rupiah(h.saldoNyata)}</Baris>
          <Baris label="Saldo buku">{rupiah(h.saldoBuku)}</Baris>
          <Baris label={h.selisih < 0 ? "Kurang" : h.selisih > 0 ? "Lebih" : "Selisih"} tebal>
            <span
              className={cn(h.selisih < 0 && "text-red-700", h.selisih > 0 && "text-emerald-700")}
            >
              {rupiah(h.selisih)}
            </span>
          </Baris>
        </div>
      </DialogFormulir>
    );
  }
  return (
    <DialogFormulir
      judul="Cocokkan kas"
      keterangan="Hitung uangnya lebih dulu. Saldo buku baru ditampilkan sesudah angka nyata disimpan. Bila ada selisih, server meminta keterangan."
      buka
      ubahBuka={(b) => !b && tutup()}
      kirim={() => m.mutate()}
      memuat={m.isPending}
      galat={m.error?.message}
      labelKirim="Simpan"
      bisaKirim={nyata !== null}
    >
      <Medan label="Akun">
        <PilihanAsli value={akun} onChange={(e) => setAkun(e.target.value as Akun)}>
          <option value="tunai">Tunai (brankas)</option>
          <option value="bank">Bank</option>
        </PilihanAsli>
      </Medan>
      <IsianRupiah label="Saldo nyata" nilai={nyata} ubah={setNyata} />
      <Isian
        label="Keterangan (wajib bila ada selisih)"
        value={keterangan}
        maxLength={200}
        onChange={(e) => setKeterangan(e.target.value)}
      />
    </DialogFormulir>
  );
}
