import { angsuranKe, hitungGulung } from "@opennael/domain";
import { eq, sql } from "drizzle-orm";
import { nasabah, pinjaman, transaksi } from "../../../db/skema";
import type { Aktor } from "../../auth/token";
import {
  kartu,
  kolomTransaksi,
  kunciPinjaman,
  type LapanganDeps,
  pastikanBelumAdaPeristiwa,
  pastikanFoto,
  pinjamanKeBerikut,
  remBerlaku,
} from "../data";
import { bukaGerbang, VALIDASI_PENUH } from "../gerbang";
export function buatGulung(deps: LapanganDeps) {
  const sekarang = deps.sekarang ?? (() => new Date());
  const validasi = deps.validasiKalender ?? VALIDASI_PENUH;
  return async function gulung(
    aktor: Aktor,
    input: { pinjamanId: string; pokok: number; tenor: number; fotoSerahTerimaId: string },
  ) {
    const kini = sekarang();
    return deps.db.transaction(async (tx) => {
      const { tanggal } = await bukaGerbang(tx, aktor, sekarang(), {
        perluAbsen: true,
        validasi,
      });
      const asal = await kunciPinjaman(tx, aktor, input.pinjamanId);
      await pastikanBelumAdaPeristiwa(tx, asal.id, tanggal);
      const rem = await remBerlaku(tx, aktor, asal.nasabahId);
      const rencana = hitungGulung(
        { ...asal, angsuranKe: angsuranKe(asal) },
        input.pokok,
        input.tenor,
        {
          gulungDikunci: rem.gulung,
          naikDikunci: rem.naik,
          alasan: rem.gulung ? rem.alasan("gulung") : rem.alasan("naik"),
        },
      );
      await pastikanFoto(tx, aktor, input.fotoSerahTerimaId, kini);

      const [t] = await tx
        .insert(transaksi)
        .values({
          kantorId: aktor.kantorId,
          pencatatId: aktor.penggunaId,
          pinjamanId: asal.id,
          tanggal,
          jenis: "gulung",
          setoranPelunasan: asal.saldo,
          saldoSesudah: 0,
        })
        .returning(kolomTransaksi);
      // Asal ditutup lebih dulu: satu pinjaman aktif per nasabah.
      await tx
        .update(pinjaman)
        .set({ saldo: 0, status: "digulung", tanggalSelesai: tanggal, tanggalMacet: null })
        .where(eq(pinjaman.id, asal.id));
      const s = rencana.syarat;
      const [baru] = await tx
        .insert(pinjaman)
        .values({
          kantorId: aktor.kantorId,
          pencairId: aktor.penggunaId,
          dibuatOleh: aktor.penggunaId,
          nasabahId: asal.nasabahId,
          pinjamanKe: await pinjamanKeBerikut(tx, asal.nasabahId),
          jenis: s.jenis,
          tenor: s.tenor,
          asal: "gulung",
          pinjamanAsalId: asal.id,
          jenisGulung: rencana.jenisGulung,
          fotoSerahTerimaId: input.fotoSerahTerimaId,
          tanggalAkad: tanggal,
          pokok: s.pokok,
          potonganAdmin: s.potonganAdmin,
          tabunganMasuk: s.tabunganMasuk,
          saldoLama: rencana.saldoLama,
          pencairan: rencana.pencairan,
          totalKembali: s.totalKembali,
          angsuran: s.angsuran,
          saldoAwal: s.totalKembali,
          dropBaru: rencana.dropBaru,
          dropGulung: rencana.dropGulung,
          pokokBerkurang: rencana.pokokBerkurang,
          saldo: s.totalKembali,
        })
        .returning({ id: pinjaman.id });
      if (!t || !baru) throw new Error("gagal mencatat gulung");
      await tx
        .update(nasabah)
        .set({ saldoTabungan: sql`${nasabah.saldoTabungan} + ${s.tabunganMasuk}` })
        .where(eq(nasabah.id, asal.nasabahId));
      return { transaksi: t, pinjamanBaru: await kartu(tx, baru.id) };
    });
  };
}
