import type {
  BatalInput,
  BukaKasInput,
  MutasiInput,
  PencocokanInput,
  UbahKasAwalInput,
} from "@opennael/contracts";
import { geserTanggal, syaratAkunMutasi } from "@opennael/domain";
import { and, asc, between, eq, sql } from "drizzle-orm";
import type { Db } from "../../platform/db/klien";
import {
  bukuKas,
  mutasiKasKantor,
  pencocokanKas,
  pengguna,
  pinjaman,
  posisiHarian,
} from "../../platform/db/skema";
import type { Aktor } from "../../platform/http/aktor";
import {
  batalHanyaHariIni,
  bentrok,
  bukuKasBelumDibuka,
  melanggar,
  sudahDibatalkan,
  tidakDitemukan,
} from "../../platform/http/galat";
import { wajibPeran } from "../../platform/http/peran";
import { catatRiwayat } from "../../platform/riwayat";
import { bacaKalender } from "../kantor";
import { daftarGerakan, kasDiLapangan, saldoAkun, tabunganNasabah } from "./saldo";

/**
 * KAS KANTOR — buku kas (titik nol), mutasi tangan bos, laporan kas (bos),
 * dan pencocokan kas hitung buta (bos & pengawas). Docs: schema-buku-kas.md,
 * schema-mutasi-kas-kantor.md, schema-pencocokan-kas.md.
 */
export interface KasDeps {
  db: Db;
  sekarang?: () => Date;
}

const iso = (d: Date | null) => d?.toISOString() ?? null;

type BarisBuku = typeof bukuKas.$inferSelect;
const keBuku = (b: BarisBuku) => ({
  tanggalBuka: b.tanggalBuka,
  kasAwalTunai: b.kasAwalTunai,
  kasAwalBank: b.kasAwalBank,
  dibukaAt: b.dibukaAt.toISOString(),
});

type BarisMutasi = typeof mutasiKasKantor.$inferSelect;
const keMutasi = (m: BarisMutasi) => ({
  id: m.id,
  tanggal: m.tanggal,
  jenis: m.jenis,
  dariAkun: m.dariAkun,
  keAkun: m.keAkun,
  nominal: m.nominal,
  keterangan: m.keterangan,
  dibuatAt: m.dibuatAt.toISOString(),
  dibatalkanAt: iso(m.dibatalkanAt),
  alasanBatal: m.alasanBatal,
});

export function buatLayananKas(deps: KasDeps) {
  const sekarang = deps.sekarang ?? (() => new Date());
  const hariIni = async (aktor: Aktor) =>
    (await bacaKalender(deps.db, aktor.kantorId, sekarang())).tanggal;

  async function bacaBuku(db: Db, kantorId: string, kunci = false) {
    const pilih = db.select().from(bukuKas).where(eq(bukuKas.kantorId, kantorId));
    const [b] = kunci ? await pilih.for("update") : await pilih;
    return b ?? null;
  }

  async function wajibBuku(db: Db, kantorId: string) {
    const b = await bacaBuku(db, kantorId);
    if (!b) throw bukuKasBelumDibuka();
    return b;
  }

  /** Yang seharusnya ada saat ini: tunai = brankas seharusnya; bank = saldo bank. */
  async function saldoBukuSekarang(db: Db, buku: BarisBuku, akun: "tunai" | "bank") {
    const saldo = await saldoAkun(db, buku);
    return akun === "bank" ? saldo.bank : saldo.tunai - (await kasDiLapangan(db, buku));
  }

  const kolomPencocokan = {
    id: pencocokanKas.id,
    tanggal: pencocokanKas.tanggal,
    akun: pencocokanKas.akun,
    saldoBuku: pencocokanKas.saldoBuku,
    saldoNyata: pencocokanKas.saldoNyata,
    selisih: pencocokanKas.selisih,
    keterangan: pencocokanKas.keterangan,
    olehId: pengguna.id,
    olehNama: pengguna.nama,
    dibuatAt: pencocokanKas.dibuatAt,
    dibatalkanAt: pencocokanKas.dibatalkanAt,
    alasanBatal: pencocokanKas.alasanBatal,
  };
  const pilihPencocokan = (db: Db) =>
    db
      .select(kolomPencocokan)
      .from(pencocokanKas)
      .innerJoin(pengguna, eq(pengguna.id, pencocokanKas.dicocokkanOleh));
  const kePencocokan = ({
    olehId,
    olehNama,
    dibuatAt,
    dibatalkanAt,
    ...p
  }: Awaited<ReturnType<ReturnType<typeof pilihPencocokan>["execute"]>>[number]) => ({
    ...p,
    dicocokkanOleh: { id: olehId, nama: olehNama },
    dibuatAt: dibuatAt.toISOString(),
    dibatalkanAt: iso(dibatalkanAt),
  });

  return {
    // ---- buku kas ------------------------------------------------------------

    /** Buka buku kas (bos, sekali) — tanggal buka = hari ini. */
    async bukaKas(aktor: Aktor, input: BukaKasInput) {
      wajibPeran(aktor, "bos");
      const tanggal = await hariIni(aktor);
      if (await bacaBuku(deps.db, aktor.kantorId)) {
        throw bentrok("BUKU_KAS_SUDAH_DIBUKA", "Buku kas kantor sudah dibuka");
      }
      const [b] = await deps.db
        .insert(bukuKas)
        .values({
          kantorId: aktor.kantorId,
          tanggalBuka: tanggal,
          kasAwalTunai: input.tunai,
          kasAwalBank: input.bank,
          dibukaOleh: aktor.penggunaId,
        })
        .returning();
      if (!b) throw new Error("buku kas tak tersimpan");
      return keBuku(b);
    },

    /** Betulkan kas awal (bos) — hanya di hari pembukaan; dicatat di riwayat. */
    async ubahKasAwal(aktor: Aktor, input: UbahKasAwalInput) {
      wajibPeran(aktor, "bos");
      const tanggal = await hariIni(aktor);
      return deps.db.transaction(async (tx) => {
        const b = await bacaBuku(tx, aktor.kantorId, true);
        if (!b) throw bukuKasBelumDibuka();
        if (b.tanggalBuka !== tanggal) {
          throw melanggar(
            "BATAL_HANYA_HARI_INI",
            "Kas awal hanya bisa dibetulkan di hari pembukaan — sesudahnya lewat mutasi lain-lain",
          );
        }
        const sesudah = {
          kasAwalTunai: input.tunai ?? b.kasAwalTunai,
          kasAwalBank: input.bank ?? b.kasAwalBank,
        };
        const [baru] = await tx
          .update(bukuKas)
          .set(sesudah)
          .where(eq(bukuKas.kantorId, aktor.kantorId))
          .returning();
        if (!baru) throw new Error("buku kas hilang");
        await catatRiwayat(tx, {
          kantorId: aktor.kantorId,
          tabel: "buku_kas",
          barisId: aktor.kantorId,
          aksi: "ubah_kas_awal",
          sebelum: { kasAwalTunai: b.kasAwalTunai, kasAwalBank: b.kasAwalBank },
          sesudah,
          pelakuId: aktor.penggunaId,
        });
        return keBuku(baru);
      });
    },

    /** Laporan kas (bos saja — pengawas mencocokkan dengan hitung buta). */
    async laporan(aktor: Aktor, saring: { mulai?: string; selesai?: string }) {
      wajibPeran(aktor, "bos");
      const hari = await hariIni(aktor);
      const mulai = saring.mulai ?? hari;
      const selesai = saring.selesai ?? (saring.mulai ? mulai : hari);
      if (mulai > selesai) {
        throw melanggar("RENTANG_TIDAK_SAH", "Tanggal mulai sesudah tanggal selesai");
      }
      const kosong = { saldoAwal: 0, masuk: 0, keluar: 0, saldoAkhir: 0 };
      const buku = await bacaBuku(deps.db, aktor.kantorId);
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
      const awal = await saldoAkun(deps.db, buku, geserTanggal(mulai, -1));
      const gerakan = await daftarGerakan(deps.db, buku, mulai, selesai);
      const ringkas = (akun: "tunai" | "bank") => {
        const g = gerakan.filter((x) => x.akun === akun);
        const masuk = g.filter((x) => x.nominal > 0).reduce((s, x) => s + x.nominal, 0);
        const keluar = g.filter((x) => x.nominal < 0).reduce((s, x) => s - x.nominal, 0);
        return { saldoAwal: awal[akun], masuk, keluar, saldoAkhir: awal[akun] + masuk - keluar };
      };
      const lapangan = await kasDiLapangan(deps.db, buku);
      const kini = await saldoAkun(deps.db, buku);
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

    // ---- mutasi kas kantor ----------------------------------------------------

    /** Catat mutasi (bos) — hari ini; akun mengikuti arah jenisnya. */
    async catatMutasi(aktor: Aktor, input: MutasiInput) {
      wajibPeran(aktor, "bos");
      const akun = syaratAkunMutasi(input);
      await wajibBuku(deps.db, aktor.kantorId);
      const [m] = await deps.db
        .insert(mutasiKasKantor)
        .values({
          kantorId: aktor.kantorId,
          tanggal: await hariIni(aktor),
          jenis: input.jenis,
          ...akun,
          nominal: input.nominal,
          keterangan: input.keterangan,
          dibuatOleh: aktor.penggunaId,
        })
        .returning();
      if (!m) throw new Error("mutasi tak tersimpan");
      return keMutasi(m);
    },

    /** Batal mutasi (bos) — hari yang sama. */
    async batalMutasi(aktor: Aktor, id: string, input: BatalInput) {
      wajibPeran(aktor, "bos");
      const tanggal = await hariIni(aktor);
      return deps.db.transaction(async (tx) => {
        const [m] = await tx
          .select()
          .from(mutasiKasKantor)
          .where(and(eq(mutasiKasKantor.id, id), eq(mutasiKasKantor.kantorId, aktor.kantorId)))
          .for("update");
        if (!m) throw tidakDitemukan("MUTASI_TIDAK_DITEMUKAN", "Mutasi tidak ditemukan");
        if (m.dibatalkanAt) throw sudahDibatalkan();
        if (m.tanggal !== tanggal) throw batalHanyaHariIni();
        const [baru] = await tx
          .update(mutasiKasKantor)
          .set({
            dibatalkanAt: sekarang(),
            dibatalkanOleh: aktor.penggunaId,
            alasanBatal: input.alasan,
          })
          .where(eq(mutasiKasKantor.id, id))
          .returning();
        if (!baru) throw new Error("mutasi hilang");
        return keMutasi(baru);
      });
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
      const hari = await hariIni(aktor);
      const tanggal = saring.tanggal ?? hari;
      if (tanggal > hari) throw melanggar("TANGGAL_DEPAN", "Posisi modal hanya sampai hari ini");
      const buku = await bacaBuku(deps.db, aktor.kantorId);
      const saldo = buku ? await saldoAkun(deps.db, buku, tanggal) : null;
      const lapangan = buku && tanggal === hari ? await kasDiLapangan(deps.db, buku) : null;

      let piutang: { berjalan: number; macet: number } | null;
      if (tanggal === hari) {
        const [p] = await deps.db
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
        const [p] = await deps.db
          .select({
            baris: sql<number>`count(*)`.mapWith(Number),
            berjalan: sql<number>`coalesce(sum(${posisiHarian.saldoBerjalan}), 0)`.mapWith(Number),
            macet: sql<number>`coalesce(sum(${posisiHarian.saldoMacet}), 0)`.mapWith(Number),
          })
          .from(posisiHarian)
          .where(and(eq(posisiHarian.kantorId, aktor.kantorId), eq(posisiHarian.tanggal, tanggal)));
        piutang = p && p.baris > 0 ? { berjalan: p.berjalan, macet: p.macet } : null;
      }
      const tabungan = await tabunganNasabah(deps.db, aktor.kantorId, tanggal);
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

    // ---- pencocokan kas --------------------------------------------------------

    /**
     * Cocokkan kas (bos/pengawas) — HITUNG BUTA: saldo buku dihitung &
     * dibekukan di transaksi yang sama, lalu baru dijawab bersama selisihnya.
     */
    async cocokkan(aktor: Aktor, input: PencocokanInput) {
      wajibPeran(aktor, "bos", "pengawas");
      const tanggal = await hariIni(aktor);
      return deps.db.transaction(async (tx) => {
        const buku = await wajibBuku(tx, aktor.kantorId);
        const saldoBuku = await saldoBukuSekarang(tx, buku, input.akun);
        if (input.saldoNyata !== saldoBuku && !input.keterangan) {
          throw melanggar(
            "KETERANGAN_SELISIH_WAJIB",
            "Hitungan tidak sama dengan buku — isi keterangan (dugaan sebab), angka hitungan tetap",
          );
        }
        const [baru] = await tx
          .insert(pencocokanKas)
          .values({
            kantorId: aktor.kantorId,
            tanggal,
            akun: input.akun,
            saldoBuku,
            saldoNyata: input.saldoNyata,
            keterangan: input.keterangan ?? null,
            dicocokkanOleh: aktor.penggunaId,
          })
          .returning({ id: pencocokanKas.id });
        if (!baru) throw new Error("pencocokan tak tersimpan");
        const [hasil] = await pilihPencocokan(tx).where(eq(pencocokanKas.id, baru.id));
        if (!hasil) throw new Error("pencocokan hilang");
        return kePencocokan(hasil);
      });
    },

    /** Batal pencocokan (bos) — salah hitung, hari yang sama. */
    async batalPencocokan(aktor: Aktor, id: string, input: BatalInput) {
      wajibPeran(aktor, "bos");
      const tanggal = await hariIni(aktor);
      return deps.db.transaction(async (tx) => {
        const [p] = await tx
          .select({ tanggal: pencocokanKas.tanggal, dibatalkanAt: pencocokanKas.dibatalkanAt })
          .from(pencocokanKas)
          .where(and(eq(pencocokanKas.id, id), eq(pencocokanKas.kantorId, aktor.kantorId)))
          .for("update");
        if (!p) throw tidakDitemukan("PENCOCOKAN_TIDAK_DITEMUKAN", "Pencocokan tidak ditemukan");
        if (p.dibatalkanAt) throw sudahDibatalkan();
        if (p.tanggal !== tanggal) throw batalHanyaHariIni();
        await tx
          .update(pencocokanKas)
          .set({
            dibatalkanAt: sekarang(),
            dibatalkanOleh: aktor.penggunaId,
            alasanBatal: input.alasan,
          })
          .where(eq(pencocokanKas.id, id));
        const [hasil] = await pilihPencocokan(tx).where(eq(pencocokanKas.id, id));
        if (!hasil) throw new Error("pencocokan hilang");
        return kePencocokan(hasil);
      });
    },

    /** Riwayat pencocokan — bos: semua; pengawas: miliknya sendiri. */
    async daftarPencocokan(aktor: Aktor, saring: { mulai?: string; selesai?: string }) {
      wajibPeran(aktor, "bos", "pengawas");
      const hari = await hariIni(aktor);
      const mulai = saring.mulai ?? hari;
      const selesai = saring.selesai ?? (saring.mulai ? mulai : hari);
      const baris = await pilihPencocokan(deps.db)
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

export type LayananKas = ReturnType<typeof buatLayananKas>;
