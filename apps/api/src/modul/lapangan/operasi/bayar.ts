import { hitungBayar } from "@opennael/domain";
import { eq } from "drizzle-orm";
import { pinjaman, transaksi } from "../../../db/skema";
import type { Aktor } from "../../auth/token";
import {
  kolomTransaksi,
  kunciPinjaman,
  type LapanganDeps,
  pastikanBelumAdaPeristiwa,
} from "../data";
import { bukaGerbang, VALIDASI_PENUH } from "../gerbang";
export function buatBayar(deps: LapanganDeps) {
  const sekarang = deps.sekarang ?? (() => new Date());
  const validasi = deps.validasiKalender ?? VALIDASI_PENUH;
  return async function bayar(
    aktor: Aktor,
    input: { pinjamanId: string; setoranMurni: number; setoranPelunasan: number },
  ) {
    return deps.db.transaction(async (tx) => {
      const { tanggal } = await bukaGerbang(tx, aktor, sekarang(), {
        perluAbsen: true,
        validasi,
      });
      const p = await kunciPinjaman(tx, aktor, input.pinjamanId);
      await pastikanBelumAdaPeristiwa(tx, p.id, tanggal);
      const { sisaSaldo } = hitungBayar(p, input.setoranMurni, input.setoranPelunasan);
      const [t] = await tx
        .insert(transaksi)
        .values({
          kantorId: aktor.kantorId,
          pencatatId: aktor.penggunaId,
          pinjamanId: p.id,
          tanggal,
          jenis: "angsuran",
          setoranMurni: input.setoranMurni,
          setoranPelunasan: input.setoranPelunasan,
          saldoSesudah: sisaSaldo,
        })
        .returning(kolomTransaksi);
      await tx.update(pinjaman).set({ saldo: sisaSaldo }).where(eq(pinjaman.id, p.id));
      if (!t) throw new Error("gagal mencatat setoran");
      return t;
    });
  };
}
