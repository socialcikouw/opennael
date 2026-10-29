import { and, eq } from "drizzle-orm";
import type { Db } from "../../../platform/db/klien";
import { foto, pinjaman } from "../../../platform/db/skema";
import type { Aktor } from "../../../platform/http/aktor";
import { bentrok, melanggar } from "../../../platform/http/galat";

export const UMUR_FOTO_MS = 60 * 60 * 1000;

export async function pastikanFoto(tx: Db, aktor: Aktor, fotoId: string, kini: Date) {
  const [f] = await tx
    .select({ jenis: foto.jenis, oleh: foto.diunggahOleh, dibuatAt: foto.dibuatAt })
    .from(foto)
    .where(and(eq(foto.id, fotoId), eq(foto.kantorId, aktor.kantorId)))
    .limit(1);
  if (!f) throw melanggar("FOTO_TIDAK_DITEMUKAN", "Foto serah terima tidak ditemukan");
  if (f.jenis !== "serah_terima")
    throw melanggar("FOTO_BUKAN_SERAH_TERIMA", "Foto ini bukan foto serah terima");
  if (f.oleh !== aktor.penggunaId) {
    throw melanggar(
      "FOTO_BUKAN_MILIK_ANDA",
      "Foto serah terima harus diambil dari HP Anda sendiri",
    );
  }
  if (kini.getTime() - f.dibuatAt.getTime() > UMUR_FOTO_MS) {
    throw melanggar("FOTO_KEDALUWARSA", "Foto serah terima lebih dari 1 jam — potret ulang");
  }
  const [dipakai] = await tx
    .select({ id: pinjaman.id })
    .from(pinjaman)
    .where(eq(pinjaman.fotoSerahTerimaId, fotoId))
    .limit(1);
  if (dipakai) throw bentrok("FOTO_SUDAH_DIPAKAI", "Foto ini sudah dipakai akad lain");
}
