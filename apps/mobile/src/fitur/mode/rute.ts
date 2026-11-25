import type { JenisPinjaman } from "@opennael/domain";

/** Rute tab Mode Kerja per jenis — nama rute = nama tab (`app/kolektor/(kerja)/harian.tsx`, …). */
export const RUTE_JENIS = {
  harian: "/kolektor/harian",
  mingguan: "/kolektor/mingguan",
  tempoan: "/kolektor/tempoan",
} as const satisfies Record<JenisPinjaman, string>;

export function ruteJenis(jenis: JenisPinjaman): (typeof RUTE_JENIS)[JenisPinjaman] {
  return RUTE_JENIS[jenis];
}
