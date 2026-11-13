import type { Db } from "../../../platform/db/klien";
import { buatKueriNasabah } from "./kueri";
import { buatKueriBacaNasabah } from "./kueri-baca";
import { buatPindahNasabah } from "./operasi/pindah";
import { buatRekamLokasi } from "./operasi/rekam-lokasi";
import { buatUbahNasabah } from "./operasi/ubah";

/**
 * KELOLA NASABAH — daftar & cari (bos, pengawas: semua; kolektor: pegangannya;
 * kasir: nama & kampung), sunting identitas & pindah pemegang (bos), titik
 * rumah (bos / kolektor pemegang). Perubahan identitas, pemegang, dan titik
 * rumah tercatat di `riwayat_perubahan` (NIK tersamar di jejak).
 * Docs: schema-nasabah.md.
 */
export interface NasabahDeps {
  db: Db;
}

export function buatLayananNasabah(deps: NasabahDeps) {
  return {
    ...buatKueriNasabah(deps),
    ...buatKueriBacaNasabah(deps),
    ubah: buatUbahNasabah(deps),
    pindah: buatPindahNasabah(deps),
    rekamLokasi: buatRekamLokasi(deps),
  };
}

export type LayananNasabah = ReturnType<typeof buatLayananNasabah>;
