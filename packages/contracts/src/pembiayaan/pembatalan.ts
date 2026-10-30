import { z } from "zod";

/**
 * PEMBATALAN OLEH BOS (aturan-usaha L) — batal transaksi kolektor & batal
 * akad salah input; hari yang sama, sebelum kas kolektor diterima.
 * Masukan: `batalSchema` (setoran-sore). Docs: schema-transaksi.md,
 * schema-pinjaman.md.
 */

const statusPinjaman = z.enum(["berjalan", "macet", "lunas", "digulung", "batal", "diputihkan"]);

/** `POST /transaksi/:id/batal` */
export const hasilBatalTransaksiSchema = z.object({
  id: z.uuid(),
  jenis: z.enum(["angsuran", "pelunasan", "gulung"]),
  tanggal: z.string(),
  alasanBatal: z.string(),
  /** Pinjaman sesudah dikembalikan. */
  pinjaman: z.object({ id: z.uuid(), status: statusPinjaman, saldo: z.number() }),
  /** Gulung: pinjaman penerus yang ikut dibatalkan. */
  penerusDibatalkanId: z.uuid().nullable(),
  /** Transfer setoran yang menempel & ikut dibatalkan. */
  transferDibatalkan: z.number(),
});

/** `POST /pinjaman/:id/batal` */
export const hasilBatalAkadSchema = z.object({
  id: z.uuid(),
  status: statusPinjaman,
  alasanBatal: z.string(),
  /** Tabungan masuk akad yang ditarik lagi dari saldo tabungan nasabah. */
  tabunganDitarik: z.number(),
});
