import type { PencocokanInput } from "@opennael/contracts";
import { eq } from "drizzle-orm";
import { pencocokanKas } from "../../../platform/db/skema";
import type { Aktor } from "../../../platform/http/aktor";
import { melanggar } from "../../../platform/http/galat";
import { wajibPeran } from "../../../platform/http/peran";
import { type Konteks, kePencocokan, pilihPencocokan, saldoBukuSekarang, wajibBuku } from "../data";

export function buatCocokkan(k: Konteks) {
  /**
   * Cocokkan kas (bos/pengawas) — HITUNG BUTA: saldo buku dihitung &
   * dibekukan di transaksi yang sama, lalu baru dijawab bersama selisihnya.
   */
  return async function cocokkan(aktor: Aktor, input: PencocokanInput) {
    wajibPeran(aktor, "bos", "pengawas");
    const tanggal = await k.hariIni(aktor);
    return k.db.transaction(async (tx) => {
      const buku = await wajibBuku(tx, aktor.kantorId);
      const saldoBuku = await saldoBukuSekarang(tx, buku, input.akun);
      if (input.saldoNyata !== saldoBuku && !input.keterangan) {
        throw melanggar(
          "KETERANGAN_SELISIH_WAJIB",
          "Hitungan tidak sama dengan buku — isi keterangan (dugaan sebab), angka hitungan tetap",
        );
      }
      const [baru] = await tx
        .insert(pencocokanKas)
        .values({
          kantorId: aktor.kantorId,
          tanggal,
          akun: input.akun,
          saldoBuku,
          saldoNyata: input.saldoNyata,
          keterangan: input.keterangan ?? null,
          dicocokkanOleh: aktor.penggunaId,
        })
        .returning({ id: pencocokanKas.id });
      if (!baru) throw new Error("pencocokan tak tersimpan");
      const [hasil] = await pilihPencocokan(tx).where(eq(pencocokanKas.id, baru.id));
      if (!hasil) throw new Error("pencocokan hilang");
      return kePencocokan(hasil);
    });
  };
}
