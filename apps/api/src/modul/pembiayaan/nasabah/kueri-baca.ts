import type { NasabahJawaban } from "@opennael/contracts";
import { kunciWilayah } from "@opennael/domain";
import { and, asc, eq, ilike, inArray, isNull, sql } from "drizzle-orm";
import type { Db } from "../../../platform/db/klien";
import {
  nasabah,
  penarikanTabungan,
  pinjaman,
  transaksi,
  wilayah,
} from "../../../platform/db/skema";
import type { Aktor } from "../../../platform/http/aktor";
import { dilarang } from "../../../platform/http/galat";
import { wajibPeran } from "../../../platform/http/peran";
import { aktif, BATAS_DAFTAR, BATAS_SERUPA, keJawaban, kolektor, pilih, satu } from "./baris";

/** Bacaan NASABAH: satu nasabah, daftar & cari, yang serupa, dan neraca. */
export function buatKueriBacaNasabah(deps: { db: Db }) {
  return {
    /** Satu nasabah (bos, pengawas; kolektor: pegangannya) — dipakai Buku nasabah. */
    async baca(aktor: Aktor, id: string): Promise<NasabahJawaban> {
      wajibPeran(aktor, "bos", "pengawas", "kolektor");
      const b = await satu(deps.db, aktor, id);
      if (aktor.peran === "kolektor" && b.kolektorId !== aktor.penggunaId) {
        throw dilarang("BUKAN_PEGANGAN_ANDA", "Nasabah ini dipegang kolektor lain");
      }
      return keJawaban(aktor, b);
    },

    /** Daftar & cari nasabah, urut nama (paling banyak 200). */
    async daftar(aktor: Aktor, saring: { cari?: string; kolektorId?: string; bebas?: "ya" }) {
      let kolektorId = saring.kolektorId;
      if (aktor.peran === "kolektor") {
        if (kolektorId && kolektorId !== aktor.penggunaId) {
          throw dilarang("BUKAN_MILIK_ANDA", "Anda hanya bisa melihat pegangan Anda sendiri");
        }
        kolektorId = aktor.penggunaId;
      }
      const cari = saring.cari?.replace(/[\\%_]/g, (c) => `\\${c}`);
      const baris = await pilih(deps.db)
        .where(
          and(
            eq(nasabah.kantorId, aktor.kantorId),
            kolektorId ? eq(nasabah.kolektorId, kolektorId) : undefined,
            cari ? ilike(nasabah.nama, `%${cari}%`) : undefined,
            saring.bebas === "ya" ? and(isNull(nasabah.diblokirAt), isNull(aktif.id)) : undefined,
          ),
        )
        .orderBy(asc(nasabah.nama))
        .limit(BATAS_DAFTAR);
      return baris.map((b) => keJawaban(aktor, b));
    },

    /**
     * "Mungkin nasabah lama?" sebelum akad (bos, kolektor): NIK sama, atau
     * nama mirip (di kampung yang sama bila disebut). Paling banyak 10.
     */
    async serupa(aktor: Aktor, saring: { nama: string; kampung?: string; nik?: string }) {
      wajibPeran(aktor, "bos", "kolektor");
      const kolom = {
        id: nasabah.id,
        nama: nasabah.nama,
        kampung: wilayah.nama,
        kolektorId: kolektor.id,
        kolektorNama: kolektor.nama,
        diblokirAt: nasabah.diblokirAt,
        pinjamanId: aktif.id,
      };
      const dasar = () =>
        deps.db
          .select(kolom)
          .from(nasabah)
          .innerJoin(wilayah, eq(wilayah.id, nasabah.wilayahId))
          .innerJoin(kolektor, eq(kolektor.id, nasabah.kolektorId))
          .leftJoin(
            aktif,
            and(eq(aktif.nasabahId, nasabah.id), inArray(aktif.status, ["berjalan", "macet"])),
          );
      const lewatNik = saring.nik
        ? await dasar().where(
            and(eq(nasabah.kantorId, aktor.kantorId), eq(nasabah.nik, saring.nik)),
          )
        : [];
      const cari = saring.nama.replace(/[\\%_]/g, (c) => `\\${c}`);
      const lewatNama = await dasar()
        .where(
          and(
            eq(nasabah.kantorId, aktor.kantorId),
            ilike(nasabah.nama, `%${cari}%`),
            saring.kampung ? eq(wilayah.kunci, kunciWilayah(saring.kampung)) : undefined,
          ),
        )
        .orderBy(asc(nasabah.nama))
        .limit(BATAS_SERUPA);
      const ke = (b: (typeof lewatNama)[number], cocok: "nik" | "nama") => ({
        id: b.id,
        nama: b.nama,
        kampung: b.kampung,
        kolektor: { id: b.kolektorId, nama: b.kolektorNama },
        cocok,
        diblokir: b.diblokirAt !== null,
        punyaPinjamanAktif: b.pinjamanId !== null,
      });
      const hasil = lewatNik.map((b) => ke(b, "nik"));
      for (const b of lewatNama) {
        if (!hasil.some((h) => h.id === b.id)) hasil.push(ke(b, "nama"));
      }
      return hasil.slice(0, BATAS_SERUPA);
    },

    /**
     * Neraca nasabah (bos, pengawas) — bahan menimbang pemutihan: uang keluar
     * ke nasabah vs uang dari kantongnya, tabungan, piutang.
     */
    async neraca(aktor: Aktor, id: string) {
      wajibPeran(aktor, "bos", "pengawas");
      const n = await satu(deps.db, aktor, id);
      const [p] = await deps.db
        .select({
          jumlah: sql<number>`count(*) filter (where ${pinjaman.status} <> 'batal')`.mapWith(
            Number,
          ),
          pencairan:
            sql<number>`coalesce(sum(${pinjaman.pencairan}) filter (where ${pinjaman.status} <> 'batal'), 0)`.mapWith(
              Number,
            ),
          aktif:
            sql<number>`coalesce(sum(${pinjaman.saldo}) filter (where ${pinjaman.status} in ('berjalan', 'macet')), 0)`.mapWith(
              Number,
            ),
          diputihkan:
            sql<number>`coalesce(sum(${pinjaman.saldo}) filter (where ${pinjaman.status} = 'diputihkan'), 0)`.mapWith(
              Number,
            ),
        })
        .from(pinjaman)
        .where(eq(pinjaman.nasabahId, id));
      const [t] = await deps.db
        .select({
          // Uang lebih pada angsuran dibayar nasabah; pada pelunasan & gulung tidak.
          setoran: sql<number>`coalesce(sum(${transaksi.setoranMurni}
            + CASE WHEN ${transaksi.jenis} = 'angsuran' THEN ${transaksi.setoranPelunasan} ELSE 0 END), 0)`.mapWith(
            Number,
          ),
          // D2: tabungan melebihi saldo saat lunas diserahkan tunai.
          sisaTabungan:
            sql<number>`coalesce(sum(greatest(${transaksi.tabunganKeluar} - ${transaksi.setoranPelunasan}, 0))
            filter (where ${transaksi.jenis} = 'pelunasan'), 0)`.mapWith(Number),
        })
        .from(transaksi)
        .innerJoin(pinjaman, eq(pinjaman.id, transaksi.pinjamanId))
        .where(and(eq(pinjaman.nasabahId, id), isNull(transaksi.dibatalkanAt)));
      const [tarik] = await deps.db
        .select({
          nominal: sql<number>`coalesce(sum(${penarikanTabungan.nominal}), 0)`.mapWith(Number),
        })
        .from(penarikanTabungan)
        .where(and(eq(penarikanTabungan.nasabahId, id), isNull(penarikanTabungan.dibatalkanAt)));
      const totalPencairan = p?.pencairan ?? 0;
      const totalSetoran = t?.setoran ?? 0;
      const tabunganDikembalikan = (t?.sisaTabungan ?? 0) + (tarik?.nominal ?? 0);
      const piutangAktif = p?.aktif ?? 0;
      return {
        nasabah: { id: n.id, nama: n.nama },
        jumlahPinjaman: p?.jumlah ?? 0,
        totalPencairan,
        tabunganDikembalikan,
        totalSetoran,
        arusKas: totalSetoran - totalPencairan - tabunganDikembalikan,
        tabungan: n.saldoTabungan,
        piutangAktif,
        piutangDiputihkan: p?.diputihkan ?? 0,
        neraca: n.saldoTabungan - piutangAktif,
      };
    },
  };
}
