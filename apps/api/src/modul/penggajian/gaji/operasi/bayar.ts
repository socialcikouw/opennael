import type { BayarGajiInput } from "@opennael/contracts";
import { gajiBersih } from "@opennael/domain";
import { eq } from "drizzle-orm";
import { bukuKas, pembayaranGaji } from "../../../../platform/db/skema";
import type { Aktor } from "../../../../platform/http/aktor";
import { bentrok, bukuKasBelumDibuka, melanggar } from "../../../../platform/http/galat";
import { wajibPeran } from "../../../../platform/http/peran";
import { hitung, type Konteks, keSlip, namaKolektor, pilihSlip, sudahDibayar } from "../data";

export function buatBayarGaji(k: Konteks) {
  /** Bayar gaji (bos) — periode sudah berakhir, belum dibayar; angka dibekukan. */
  return async function bayar(aktor: Aktor, input: BayarGajiInput) {
    wajibPeran(aktor, "bos");
    const tanggal = await k.hariIni(aktor);
    if (input.periodeMulai > input.periodeSelesai) {
      throw melanggar("RENTANG_TIDAK_SAH", "Tanggal mulai sesudah tanggal selesai");
    }
    if (input.periodeSelesai >= tanggal) {
      throw melanggar(
        "PERIODE_BELUM_BERAKHIR",
        "Gaji hanya dibayar untuk periode yang sudah berakhir",
      );
    }
    await namaKolektor(k.db, aktor, input.kolektorId);
    return k.db.transaction(async (tx) => {
      const [buku] = await tx
        .select({ id: bukuKas.kantorId })
        .from(bukuKas)
        .where(eq(bukuKas.kantorId, aktor.kantorId));
      if (!buku) throw bukuKasBelumDibuka();
      if (await sudahDibayar(tx, input.kolektorId, input.periodeMulai, input.periodeSelesai)) {
        throw bentrok("PERIODE_SUDAH_DIBAYAR", "Sebagian periode ini sudah dibayar");
      }
      const h = await hitung(tx, aktor, input.kolektorId, input.periodeMulai, input.periodeSelesai);
      gajiBersih(h.gajiKotor, h.potonganTekor);
      const [baru] = await tx
        .insert(pembayaranGaji)
        .values({
          kantorId: aktor.kantorId,
          kolektorId: input.kolektorId,
          periodeMulai: input.periodeMulai,
          periodeSelesai: input.periodeSelesai,
          gajiKotor: h.gajiKotor,
          potonganTekor: h.potonganTekor,
          dariAkun: input.dariAkun,
          tanggalBayar: tanggal,
          keterangan: input.keterangan ?? null,
          dibuatOleh: aktor.penggunaId,
        })
        .returning({ id: pembayaranGaji.id });
      if (!baru) throw new Error("gaji tak tersimpan");
      const [slip] = await pilihSlip(tx).where(eq(pembayaranGaji.id, baru.id));
      if (!slip) throw new Error("slip hilang");
      return keSlip(slip);
    });
  };
}
