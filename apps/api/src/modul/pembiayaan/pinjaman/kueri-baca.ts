import type { KartuPinjaman } from "@opennael/contracts";
import { and, asc, desc, eq, inArray, notInArray } from "drizzle-orm";
import { nasabah, pinjaman, riwayatStatusPinjaman } from "../../../platform/db/skema";
import type { Aktor } from "../../../platform/http/aktor";
import { dilarang, tidakDitemukan } from "../../../platform/http/galat";
import { wajibPeran } from "../../../platform/http/peran";
import { AKTIF, BATAS_DAFTAR, type Konteks, pilih } from "./baris";
import { keKartuSemua } from "./kartu";
import { rincian } from "./rincian";

/** Bacaan PINJAMAN: daftar kartu, satu pinjaman, dan garis waktu status. */
export function buatKueriBacaPinjaman(k: Konteks) {
  return {
    /** Kartu pinjaman, urut nama nasabah lalu `pinjamanKe` menurun (paling banyak 500). */
    async daftar(
      aktor: Aktor,
      saring: { status: "aktif" | "selesai" | "semua"; nasabahId?: string; kolektorId?: string },
    ): Promise<KartuPinjaman[]> {
      wajibPeran(aktor, "bos", "pengawas", "kolektor");
      let kolektorId = saring.kolektorId;
      if (aktor.peran === "kolektor") {
        if (kolektorId && kolektorId !== aktor.penggunaId) {
          throw dilarang("BUKAN_MILIK_ANDA", "Anda hanya bisa melihat pegangan Anda sendiri");
        }
        kolektorId = aktor.penggunaId;
      }
      const baris = await pilih(k.db)
        .where(
          and(
            eq(pinjaman.kantorId, aktor.kantorId),
            saring.status === "aktif" ? inArray(pinjaman.status, [...AKTIF]) : undefined,
            saring.status === "selesai" ? notInArray(pinjaman.status, [...AKTIF]) : undefined,
            saring.nasabahId ? eq(pinjaman.nasabahId, saring.nasabahId) : undefined,
            kolektorId ? eq(nasabah.kolektorId, kolektorId) : undefined,
          ),
        )
        .orderBy(asc(nasabah.nama), desc(pinjaman.pinjamanKe))
        .limit(BATAS_DAFTAR);
      return keKartuSemua(k, k.db, aktor.kantorId, baris);
    },

    /** Satu pinjaman: kartu + kolom akad lengkap + aturan macet hari ini. */
    async satu(aktor: Aktor, id: string) {
      wajibPeran(aktor, "bos", "pengawas", "kolektor");
      return rincian(k, k.db, aktor, id);
    },

    /** Garis waktu status satu pinjaman, urut kejadian (bos, pengawas). */
    async riwayatStatus(aktor: Aktor, id: string) {
      wajibPeran(aktor, "bos", "pengawas");
      const [p] = await k.db
        .select({ id: pinjaman.id })
        .from(pinjaman)
        .where(and(eq(pinjaman.id, id), eq(pinjaman.kantorId, aktor.kantorId)));
      if (!p) throw tidakDitemukan("PINJAMAN_TIDAK_DITEMUKAN", "Pinjaman tidak ditemukan");
      const baris = await k.db
        .select({
          id: riwayatStatusPinjaman.id,
          statusSebelum: riwayatStatusPinjaman.statusSebelum,
          statusSesudah: riwayatStatusPinjaman.statusSesudah,
          tanggal: riwayatStatusPinjaman.tanggal,
          dibuatAt: riwayatStatusPinjaman.dibuatAt,
        })
        .from(riwayatStatusPinjaman)
        .where(eq(riwayatStatusPinjaman.pinjamanId, id))
        .orderBy(asc(riwayatStatusPinjaman.dibuatAt));
      return baris.map((r) => ({ ...r, dibuatAt: r.dibuatAt.toISOString() }));
    },
  };
}
