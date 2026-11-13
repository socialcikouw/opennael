import { GalatAturan, gajiBersih } from "@opennael/domain";
import { and, desc, eq } from "drizzle-orm";
import { pembayaranGaji } from "../../../platform/db/skema";
import type { Aktor } from "../../../platform/http/aktor";
import { dilarang, melanggar } from "../../../platform/http/galat";
import { wajibPeran } from "../../../platform/http/peran";
import { hitung, type Konteks, keSlip, namaKolektor, pilihSlip, sudahDibayar } from "./data";

/** Bacaan GAJI: pratinjau periode dan riwayat slip. */
export function buatKueriGaji(k: Konteks) {
  return {
    /** Pratinjau gaji (bos) — angka yang akan dibekukan bila dibayar hari ini. */
    async pratinjau(aktor: Aktor, saring: { kolektorId: string; mulai: string; selesai: string }) {
      wajibPeran(aktor, "bos");
      if (saring.mulai > saring.selesai) {
        throw melanggar("RENTANG_TIDAK_SAH", "Tanggal mulai sesudah tanggal selesai");
      }
      const nama = await namaKolektor(k.db, aktor, saring.kolektorId);
      const h = await hitung(k.db, aktor, saring.kolektorId, saring.mulai, saring.selesai);
      let halangan: string | null = null;
      if (saring.selesai >= (await k.hariIni(aktor))) halangan = "PERIODE_BELUM_BERAKHIR";
      else if (await sudahDibayar(k.db, saring.kolektorId, saring.mulai, saring.selesai)) {
        halangan = "PERIODE_SUDAH_DIBAYAR";
      } else {
        try {
          gajiBersih(h.gajiKotor, h.potonganTekor);
        } catch (e) {
          if (!(e instanceof GalatAturan)) throw e;
          halangan = e.kode;
        }
      }
      return {
        kolektor: { id: saring.kolektorId, nama },
        periodeMulai: saring.mulai,
        periodeSelesai: saring.selesai,
        ...h,
        gajiBersih: h.gajiKotor - h.potonganTekor,
        halangan: halangan as
          | "PERIODE_BELUM_BERAKHIR"
          | "PERIODE_SUDAH_DIBAYAR"
          | "TEKOR_MELEBIHI_GAJI"
          | "GAJI_KOTOR_MINUS"
          | null,
      };
    },

    /** Riwayat slip — bos & pengawas: semua; kolektor: miliknya. */
    async daftar(aktor: Aktor, saring: { kolektorId?: string }) {
      wajibPeran(aktor, "bos", "pengawas", "kolektor");
      let kolektorId = saring.kolektorId;
      if (aktor.peran === "kolektor") {
        if (kolektorId && kolektorId !== aktor.penggunaId) {
          throw dilarang("BUKAN_MILIK_ANDA", "Anda hanya bisa melihat slip Anda sendiri");
        }
        kolektorId = aktor.penggunaId;
      }
      const baris = await pilihSlip(k.db)
        .where(
          and(
            eq(pembayaranGaji.kantorId, aktor.kantorId),
            kolektorId ? eq(pembayaranGaji.kolektorId, kolektorId) : undefined,
          ),
        )
        .orderBy(desc(pembayaranGaji.periodeMulai), desc(pembayaranGaji.dibuatAt));
      return baris.map(keSlip);
    },
  };
}
