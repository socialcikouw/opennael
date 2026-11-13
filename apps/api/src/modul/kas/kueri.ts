import { geserTanggal } from "@opennael/domain";
import { and, asc, between, eq, sql } from "drizzle-orm";
import { pencocokanKas, pinjaman, posisiHarian } from "../../platform/db/skema";
import type { Aktor } from "../../platform/http/aktor";
import { melanggar } from "../../platform/http/galat";
import { wajibPeran } from "../../platform/http/peran";
import { bacaBuku, type Konteks, keBuku, kePencocokan, pilihPencocokan } from "./data";
import { daftarGerakan, kasDiLapangan, saldoAkun, tabunganNasabah } from "./saldo";

/** Bacaan KAS: laporan kas, posisi modal, riwayat pencocokan. */
export function buatKueriKas(k: Konteks) {
  return {
    /** Laporan kas (bos saja — pengawas mencocokkan dengan hitung buta). */
    async laporan(aktor: Aktor, saring: { mulai?: string; selesai?: string }) {
      wajibPeran(aktor, "bos");
      const hari = await k.hariIni(aktor);
      const mulai = saring.mulai ?? hari;
      const selesai = saring.selesai ?? (saring.mulai ? mulai : hari);
      if (mulai > selesai) {
        throw melanggar("RENTANG_TIDAK_SAH", "Tanggal mulai sesudah tanggal selesai");
      }
      const kosong = { saldoAwal: 0, masuk: 0, keluar: 0, saldoAkhir: 0 };
      const buku = await bacaBuku(k.db, aktor.kantorId);
      if (!buku) {
        return {
          bukuKas: null,
          mulai,
          selesai,
          tunai: kosong,
          bank: kosong,
          kasDiLapangan: 0,
          brankasSeharusnya: 0,
          gerakan: [],
        };
      }
      const awal = await saldoAkun(k.db, buku, geserTanggal(mulai, -1));
      const gerakan = await daftarGerakan(k.db, buku, mulai, selesai);
      const ringkas = (akun: "tunai" | "bank") => {
        const g = gerakan.filter((x) => x.akun === akun);
        const masuk = g.filter((x) => x.nominal > 0).reduce((s, x) => s + x.nominal, 0);
        const keluar = g.filter((x) => x.nominal < 0).reduce((s, x) => s - x.nominal, 0);
        return { saldoAwal: awal[akun], masuk, keluar, saldoAkhir: awal[akun] + masuk - keluar };
      };
      const lapangan = await kasDiLapangan(k.db, buku);
      const kini = await saldoAkun(k.db, buku);
      return {
        bukuKas: keBuku(buku),
        mulai,
        selesai,
        tunai: ringkas("tunai"),
        bank: ringkas("bank"),
        kasDiLapangan: lapangan,
        brankasSeharusnya: kini.tunai - lapangan,
        gerakan,
      };
    },

    // ---- posisi modal ----------------------------------------------------------

    /**
     * Posisi modal di akhir satu tanggal (bos saja — memuat saldo buku):
     * saldo tunai + bank + piutang aktif − tabungan nasabah (aturan-usaha M).
     * Piutang hari ini dibaca langsung dari pinjaman; tanggal lampau dari
     * potret `posisi_harian` (tanpa potret → null). Kas di lapangan hanya
     * untuk hari ini.
     */
    async posisiModal(aktor: Aktor, saring: { tanggal?: string }) {
      wajibPeran(aktor, "bos");
      const hari = await k.hariIni(aktor);
      const tanggal = saring.tanggal ?? hari;
      if (tanggal > hari) throw melanggar("TANGGAL_DEPAN", "Posisi modal hanya sampai hari ini");
      const buku = await bacaBuku(k.db, aktor.kantorId);
      const saldo = buku ? await saldoAkun(k.db, buku, tanggal) : null;
      const lapangan = buku && tanggal === hari ? await kasDiLapangan(k.db, buku) : null;

      let piutang: { berjalan: number; macet: number } | null;
      if (tanggal === hari) {
        const [p] = await k.db
          .select({
            berjalan:
              sql<number>`coalesce(sum(${pinjaman.saldo}) filter (where ${pinjaman.status} = 'berjalan'), 0)`.mapWith(
                Number,
              ),
            macet:
              sql<number>`coalesce(sum(${pinjaman.saldo}) filter (where ${pinjaman.status} = 'macet'), 0)`.mapWith(
                Number,
              ),
          })
          .from(pinjaman)
          .where(eq(pinjaman.kantorId, aktor.kantorId));
        piutang = p ?? { berjalan: 0, macet: 0 };
      } else {
        const [p] = await k.db
          .select({
            baris: sql<number>`count(*)`.mapWith(Number),
            berjalan: sql<number>`coalesce(sum(${posisiHarian.saldoBerjalan}), 0)`.mapWith(Number),
            macet: sql<number>`coalesce(sum(${posisiHarian.saldoMacet}), 0)`.mapWith(Number),
          })
          .from(posisiHarian)
          .where(and(eq(posisiHarian.kantorId, aktor.kantorId), eq(posisiHarian.tanggal, tanggal)));
        piutang = p && p.baris > 0 ? { berjalan: p.berjalan, macet: p.macet } : null;
      }
      const tabungan = await tabunganNasabah(k.db, aktor.kantorId, tanggal);
      return {
        tanggal,
        saldoTunai: saldo?.tunai ?? null,
        kasDiLapangan: lapangan,
        diBrankas: saldo && lapangan !== null ? saldo.tunai - lapangan : null,
        saldoBank: saldo?.bank ?? null,
        piutangBerjalan: piutang?.berjalan ?? null,
        piutangMacet: piutang?.macet ?? null,
        tabunganNasabah: tabungan,
        posisiModal:
          saldo && piutang
            ? saldo.tunai + saldo.bank + piutang.berjalan + piutang.macet - tabungan
            : null,
      };
    },

    /** Riwayat pencocokan — bos: semua; pengawas: miliknya sendiri. */
    async daftarPencocokan(aktor: Aktor, saring: { mulai?: string; selesai?: string }) {
      wajibPeran(aktor, "bos", "pengawas");
      const hari = await k.hariIni(aktor);
      const mulai = saring.mulai ?? hari;
      const selesai = saring.selesai ?? (saring.mulai ? mulai : hari);
      const baris = await pilihPencocokan(k.db)
        .where(
          and(
            eq(pencocokanKas.kantorId, aktor.kantorId),
            between(pencocokanKas.tanggal, mulai, selesai),
            aktor.peran === "pengawas"
              ? eq(pencocokanKas.dicocokkanOleh, aktor.penggunaId)
              : undefined,
          ),
        )
        .orderBy(asc(pencocokanKas.dibuatAt));
      return baris.map(kePencocokan);
    },
  };
}
