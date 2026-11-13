import { GalatAturan, type JenisPinjaman, syaratMigrasi } from "@opennael/domain";

export type Orang = { nama: string; kampung: string; nomorHp: string; nik: string };

export type NasabahLama = { id: string; nama: string; kampung: string; kolektor: string };

/** Pratinjau angka di HP bos sebelum dikirim — rumus yang sama dengan server. */
export function pratinjau(
  jenis: JenisPinjaman,
  tenor: number,
  pokok: number | null,
  saldo: number | null,
  tabungan: number | null,
) {
  if (!pokok || !saldo) return null;
  try {
    return { ok: syaratMigrasi(jenis, pokok, tenor, saldo, tabungan ?? 0) } as const;
  } catch (e) {
    if (e instanceof GalatAturan) return { galat: e.message } as const;
    throw e;
  }
}
