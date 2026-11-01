import type { KartuTagih } from "@opennael/contracts";
import { wajibDitagihHariIni } from "@opennael/domain";

/**
 * Pinjaman yang WAJIB ditagih hari ini (aturan-usaha B6) tetapi belum dicatat apa
 * pun — bukan bayar, bukan libur. Inilah yang menahan buka laporan (C6): server
 * menolaknya selama masih ada (`MASIH_ADA_TAGIHAN`).
 */
export function belumDicatat<
  P extends Pick<KartuTagih, "jenis" | "tanggalAkad" | "jatuhTempo" | "hariIni">,
>(pinjaman: readonly P[], tanggal: string): P[] {
  return pinjaman.filter((p) => !p.hariIni && wajibDitagihHariIni(p, tanggal));
}
