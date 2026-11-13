import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import type { Db } from "../../../platform/db/klien";
import {
  liburNasabah,
  nasabah,
  riwayatStatusPinjaman,
  transaksi,
} from "../../../platform/db/skema";
import type { Aktor } from "../../../platform/http/aktor";
import { melanggar } from "../../../platform/http/galat";

/** Pembantu privat PEMBATALAN: pemeriksaan peristiwa, status sebelum ditutup, dan tanda batal. */

/** Yang dibutuhkan semua operasi satu layanan: database, jam, dan "hari ini" kantor aktor. */
export interface Konteks {
  db: Db;
  sekarang: () => Date;
  hariIni: (aktor: Aktor) => Promise<string>;
}

export const PINJAMAN_SUDAH_BERUBAH = () =>
  melanggar(
    "PINJAMAN_SUDAH_BERUBAH",
    "Pinjaman sudah berubah sesudah catatan ini — tak bisa dibatalkan",
  );

/** Pinjaman punya peristiwa berlaku (transaksi atau libur)? */
export async function adaPeristiwa(tx: Db, pinjamanId: string) {
  const [t] = await tx
    .select({ id: transaksi.id })
    .from(transaksi)
    .where(and(eq(transaksi.pinjamanId, pinjamanId), isNull(transaksi.dibatalkanAt)))
    .limit(1);
  const [l] = await tx
    .select({ id: liburNasabah.id })
    .from(liburNasabah)
    .where(eq(liburNasabah.pinjamanId, pinjamanId))
    .limit(1);
  return Boolean(t || l);
}

/**
 * Status sebelum pinjaman ditutup (lunas/digulung), dari riwayat status —
 * macet kembali macet dengan tanggal macet aslinya.
 */
export async function statusSebelumDitutup(tx: Db, pinjamanId: string) {
  const [tutup] = await tx
    .select({ sebelum: riwayatStatusPinjaman.statusSebelum })
    .from(riwayatStatusPinjaman)
    .where(
      and(
        eq(riwayatStatusPinjaman.pinjamanId, pinjamanId),
        inArray(riwayatStatusPinjaman.statusSesudah, ["lunas", "digulung"]),
      ),
    )
    .orderBy(desc(riwayatStatusPinjaman.dibuatAt))
    .limit(1);
  if (tutup?.sebelum !== "macet") return { status: "berjalan" as const, tanggalMacet: null };
  const [macet] = await tx
    .select({ tanggal: riwayatStatusPinjaman.tanggal })
    .from(riwayatStatusPinjaman)
    .where(
      and(
        eq(riwayatStatusPinjaman.pinjamanId, pinjamanId),
        eq(riwayatStatusPinjaman.statusSesudah, "macet"),
      ),
    )
    .orderBy(desc(riwayatStatusPinjaman.dibuatAt))
    .limit(1);
  return { status: "macet" as const, tanggalMacet: macet?.tanggal ?? null };
}

export const geserTabungan = (tx: Db, nasabahId: string, selisih: number) =>
  tx
    .update(nasabah)
    .set({ saldoTabungan: sql`${nasabah.saldoTabungan} + ${selisih}` })
    .where(eq(nasabah.id, nasabahId));

export const tandaBatal = (k: Konteks, aktor: Aktor, alasan: string) => ({
  dibatalkanAt: k.sekarang(),
  dibatalkanOleh: aktor.penggunaId,
  alasanBatal: alasan,
});
