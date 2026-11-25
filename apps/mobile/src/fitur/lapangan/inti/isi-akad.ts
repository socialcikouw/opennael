import type { AkadInput } from "@opennael/contracts";
import type { SiapaNasabah } from "./langkah-akad";

/** Kampung terpilih di langkah Kampung: dari daftar kantor (`id`), atau kampung baru (`id` null). */
export interface KampungAkad {
  nama: string;
  id: string | null;
}

/**
 * Bagian `nasabah` permintaan akad dari isian langkah-langkah. PURE.
 * - Pernah melunasi → `{ nasabahId }`.
 * - Nasabah baru → nama, kampung (`wilayahId` bila dari daftar, `nama` bila baru), NIK &
 *   nomor HP hanya bila diisi (keduanya boleh kosong). Huruf kecil diurus kontrak (`teksKecil`).
 * null = isiannya belum lengkap (tombol Cairkan tak mungkin ditekan; penjaga saja).
 */
export function isiNasabahAkad(isian: {
  siapa: SiapaNasabah | null;
  lamaId: string | null;
  nama: string;
  kampung: KampungAkad | null;
  nik: string;
  nomorHp: string;
}): AkadInput["nasabah"] | null {
  if (isian.siapa === "pernah-melunasi") return isian.lamaId ? { nasabahId: isian.lamaId } : null;
  const nama = isian.nama.trim();
  const kampung = isian.kampung;
  if (isian.siapa !== "baru" || !nama || !kampung) return null;
  return {
    nama,
    kampung: kampung.id ? { wilayahId: kampung.id } : { nama: kampung.nama.trim() },
    ...(isian.nik ? { nik: isian.nik } : {}),
    ...(isian.nomorHp ? { nomorHp: isian.nomorHp } : {}),
  };
}
