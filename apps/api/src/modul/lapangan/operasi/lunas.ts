import { hitungLunas } from "@opennael/domain";
import { eq, sql } from "drizzle-orm";
import { nasabah, pinjaman, transaksi } from "../../../platform/db/skema";
import type { Aktor } from "../../../platform/http/aktor";
import {
  kolomTransaksi,
  kunciPinjaman,
  type LapanganDeps,
  pastikanBelumAdaPeristiwa,
} from "../data";
import { bukaGerbang, VALIDASI_PENUH } from "../gerbang";
export function buatLunas(deps: LapanganDeps) {
  const sekarang = deps.sekarang ?? (() => new Date());
  const validasi = deps.validasiKalender ?? VALIDASI_PENUH;
  return async function lunas(aktor: Aktor, input: { pinjamanId: string }) {
    return deps.db.transaction(async (tx) => {
      const { tanggal } = await bukaGerbang(tx, aktor, sekarang(), {
        perluAbsen: true,
        validasi,
      });
      const p = await kunciPinjaman(tx, aktor, input.pinjamanId);
      await pastikanBelumAdaPeristiwa(tx, p.id, tanggal);
      const l = hitungLunas(p.saldo, p.tabungan);
      const [t] = await tx
        .insert(transaksi)
        .values({
          kantorId: aktor.kantorId,
          pencatatId: aktor.penggunaId,
          pinjamanId: p.id,
          tanggal,
          jenis: "pelunasan",
          setoranMurni: l.setoranMurni,
          setoranPelunasan: l.setoranPelunasan,
          tabunganKeluar: l.tabunganKeluar,
          saldoSesudah: 0,
        })
        .returning(kolomTransaksi);
      await tx
        .update(pinjaman)
        .set({ saldo: 0, status: "lunas", tanggalSelesai: tanggal, tanggalMacet: null })
        .where(eq(pinjaman.id, p.id));
      await tx
        .update(nasabah)
        .set({ saldoTabungan: sql`${nasabah.saldoTabungan} - ${l.tabunganKeluar}` })
        .where(eq(nasabah.id, p.nasabahId));
      if (!t) throw new Error("gagal mencatat pelunasan");
      return t;
    });
  };
}
