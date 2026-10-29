import { hitungLunas } from "@opennael/domain";
import { eq, sql } from "drizzle-orm";
import { nasabah, pinjaman, transaksi } from "../../../../platform/db/skema";
import type { Aktor } from "../../../../platform/http/aktor";
import { bukaGerbang, type GerbangDeps } from "../../../hari-kolektor";
import { VALIDASI_PENUH } from "../../../kantor";
import { kunciPinjaman } from "../../pinjaman/data";
import { kolomTransaksi, pastikanBelumAdaPeristiwa } from "../data";
export function buatLunas(deps: GerbangDeps) {
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
