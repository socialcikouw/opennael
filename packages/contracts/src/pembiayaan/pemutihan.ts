import { z } from "zod";

/**
 * PEMUTIHAN (bos, aturan-usaha K) — piutang dihapus tanpa transaksi; saldo &
 * tabungan tak disentuh; nasabah diblokir. Batal pemutihan mengembalikan
 * status & membuka blokir bila itu pemutihan terakhirnya. Docs:
 * schema-pinjaman.md, schema-nasabah.md.
 */

export const alasanPemutihanSchema = z.enum(["macet_lama", "meninggal", "lainnya"]);

/** `POST /pinjaman/:id/putihkan` */
export const putihkanSchema = z.object({
  alasan: alasanPemutihanSchema,
  keterangan: z.string().trim().min(1).max(200),
});
export type PutihkanInput = z.infer<typeof putihkanSchema>;

const nasabahBlokirSchema = z.object({
  id: z.uuid(),
  diblokir: z.boolean(),
  alasanBlokir: z.string().nullable(),
});

export const hasilPemutihanSchema = z.object({
  id: z.uuid(),
  status: z.enum(["berjalan", "macet", "diputihkan"]),
  /** Saldo tidak disentuh — piutang yang dihapus. */
  saldo: z.number(),
  alasanPemutihan: alasanPemutihanSchema.nullable(),
  keteranganPemutihan: z.string().nullable(),
  nasabah: nasabahBlokirSchema,
});

/** `POST /nasabah/:id/buka-blokir` — masukan `batalSchema` ({ alasan }). */
export const hasilBukaBlokirSchema = nasabahBlokirSchema;
