import type { Db } from "../../../platform/db/klien";
import type { Konteks } from "./baris";
import { buatKueriPinjaman } from "./kueri";
import { buatKueriBacaPinjaman } from "./kueri-baca";
import { buatUbahPinjaman } from "./operasi/ubah";

/**
 * PINJAMAN — kartu & rincian (bos, pengawas: semua; kolektor: pegangannya),
 * sunting nomor urut (bos), garis waktu status (bos, pengawas).
 * Posisi tagih = aturan-usaha B5; aturan macet = F. Docs: schema-pinjaman.md.
 */
export interface PinjamanDeps {
  db: Db;
  sekarang?: () => Date;
}

export function buatLayananPinjaman(deps: PinjamanDeps) {
  const k: Konteks = { db: deps.db, sekarang: deps.sekarang ?? (() => new Date()) };
  return {
    ...buatKueriPinjaman(deps),
    ...buatKueriBacaPinjaman(k),
    ubah: buatUbahPinjaman(k),
  };
}

export type LayananPinjaman = ReturnType<typeof buatLayananPinjaman>;
