import type { KartuTagih } from "@opennael/contracts";
import { type JenisPinjaman, wajibDitagihHariIni } from "@opennael/domain";

/**
 * Sisa nasabah WAJIB ditagih hari ini per jenis (aturan-usaha B6: harian setiap hari kerja,
 * mingguan di hari tagihnya, tempoan sejak jatuh tempo) yang BELUM dicatat — angka merah di
 * tab Harian · Mingguan · Tempoan (Mode Kerja). PURE.
 */
export function sisaWajibPerJenis(
  daftar: readonly KartuTagih[],
  hariIni: string,
): Record<JenisPinjaman, number> {
  const hasil: Record<JenisPinjaman, number> = { harian: 0, mingguan: 0, tempoan: 0 };
  for (const p of daftar) {
    if (!p.hariIni && wajibDitagihHariIni(p, hariIni)) hasil[p.jenis] += 1;
  }
  return hasil;
}
