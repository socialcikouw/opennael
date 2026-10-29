import type { BatalInput, KoreksiInput, PenarikanInput } from "@opennael/contracts";
import { hitungKoreksi, syaratPenarikan } from "@opennael/domain";
import { and, desc, eq, ne, sql } from "drizzle-orm";
import type { Db } from "../../platform/db/klien";
import {
  bukuKas,
  koreksiTabungan,
  nasabah,
  penarikanTabungan,
  pengguna,
  pinjaman,
} from "../../platform/db/skema";
import type { Aktor } from "../../platform/http/aktor";
import {
  batalHanyaHariIni,
  bukuKasBelumDibuka,
  sudahDibatalkan,
  tidakDitemukan,
} from "../../platform/http/galat";
import { wajibPeran } from "../../platform/http/peran";
import { bacaKalender } from "../lapangan/gerbang";

/**
 * TABUNGAN NASABAH (bos) — penarikan di luar pelunasan (uang sungguhan, kas
 * keluar; boleh dibatalkan hari yang sama) dan koreksi angka (tanpa uang; tak
 * dibatalkan — dibetulkan koreksi tandingan). Keduanya menggeser cache
 * `nasabah.saldo_tabungan` di transaksi yang sama, sesudah mengunci baris
 * nasabah. Docs: schema-penarikan-tabungan.md, schema-koreksi-tabungan.md.
 */
export interface TabunganDeps {
  db: Db;
  sekarang?: () => Date;
}

const iso = (d: Date | null) => d?.toISOString() ?? null;

export function buatLayananTabungan(deps: TabunganDeps) {
  const sekarang = deps.sekarang ?? (() => new Date());
  const hariIni = async (aktor: Aktor) =>
    (await bacaKalender(deps.db, aktor.kantorId, sekarang())).tanggal;

  /** Kunci baris nasabah milik kantor ini (FOR UPDATE) — penggeser tabungan berurutan. */
  async function kunciNasabah(tx: Db, aktor: Aktor, nasabahId: string) {
    const [n] = await tx
      .select({ id: nasabah.id, saldoTabungan: nasabah.saldoTabungan })
      .from(nasabah)
      .where(and(eq(nasabah.id, nasabahId), eq(nasabah.kantorId, aktor.kantorId)))
      .for("update");
    if (!n) throw tidakDitemukan("NASABAH_TIDAK_DITEMUKAN", "Nasabah tidak ditemukan");
    return n;
  }

  async function pastikanNasabah(aktor: Aktor, nasabahId: string) {
    const [n] = await deps.db
      .select({ id: nasabah.id })
      .from(nasabah)
      .where(and(eq(nasabah.id, nasabahId), eq(nasabah.kantorId, aktor.kantorId)));
    if (!n) throw tidakDitemukan("NASABAH_TIDAK_DITEMUKAN", "Nasabah tidak ditemukan");
  }

  const geser = (tx: Db, nasabahId: string, selisih: number) =>
    tx
      .update(nasabah)
      .set({ saldoTabungan: sql`${nasabah.saldoTabungan} + ${selisih}` })
      .where(eq(nasabah.id, nasabahId));

  const pilihPenarikan = (db: Db) =>
    db
      .select({
        id: penarikanTabungan.id,
        nasabahId: penarikanTabungan.nasabahId,
        tanggal: penarikanTabungan.tanggal,
        nominal: penarikanTabungan.nominal,
        dariAkun: penarikanTabungan.dariAkun,
        saldoSebelum: penarikanTabungan.saldoSebelum,
        alasan: penarikanTabungan.alasanPenarikan,
        olehId: pengguna.id,
        olehNama: pengguna.nama,
        dibuatAt: penarikanTabungan.dibuatAt,
        dibatalkanAt: penarikanTabungan.dibatalkanAt,
        alasanBatal: penarikanTabungan.alasanBatal,
      })
      .from(penarikanTabungan)
      .innerJoin(pengguna, eq(pengguna.id, penarikanTabungan.dibuatOleh));
  const kePenarikan = ({
    olehId,
    olehNama,
    dibuatAt,
    dibatalkanAt,
    ...p
  }: Awaited<ReturnType<ReturnType<typeof pilihPenarikan>["execute"]>>[number]) => ({
    ...p,
    dibuatOleh: { id: olehId, nama: olehNama },
    dibuatAt: dibuatAt.toISOString(),
    dibatalkanAt: iso(dibatalkanAt),
  });

  const pilihKoreksi = (db: Db) =>
    db
      .select({
        id: koreksiTabungan.id,
        nasabahId: koreksiTabungan.nasabahId,
        tanggal: koreksiTabungan.tanggal,
        saldoSebelum: koreksiTabungan.saldoSebelum,
        selisih: koreksiTabungan.selisih,
        alasan: koreksiTabungan.alasanKoreksi,
        olehId: pengguna.id,
        olehNama: pengguna.nama,
        dibuatAt: koreksiTabungan.dibuatAt,
      })
      .from(koreksiTabungan)
      .innerJoin(pengguna, eq(pengguna.id, koreksiTabungan.dibuatOleh));
  const keKoreksi = ({
    olehId,
    olehNama,
    dibuatAt,
    ...k
  }: Awaited<ReturnType<ReturnType<typeof pilihKoreksi>["execute"]>>[number]) => ({
    ...k,
    saldoSesudah: k.saldoSebelum + k.selisih,
    dibuatOleh: { id: olehId, nama: olehNama },
    dibuatAt: dibuatAt.toISOString(),
  });

  return {
    // ---- penarikan -------------------------------------------------------------

    /** Penarikan tabungan (bos) — dari kas kantor; buku kas harus sudah dibuka. */
    async tarik(aktor: Aktor, nasabahId: string, input: PenarikanInput) {
      wajibPeran(aktor, "bos");
      const tanggal = await hariIni(aktor);
      return deps.db.transaction(async (tx) => {
        const n = await kunciNasabah(tx, aktor, nasabahId);
        syaratPenarikan({
          nominal: input.nominal,
          saldoSebelum: input.saldoSebelum,
          saldoSekarang: n.saldoTabungan,
        });
        const [buku] = await tx
          .select({ id: bukuKas.kantorId })
          .from(bukuKas)
          .where(eq(bukuKas.kantorId, aktor.kantorId));
        if (!buku) throw bukuKasBelumDibuka();
        const [baru] = await tx
          .insert(penarikanTabungan)
          .values({
            kantorId: aktor.kantorId,
            nasabahId,
            tanggal,
            nominal: input.nominal,
            dariAkun: input.dariAkun,
            saldoSebelum: n.saldoTabungan,
            alasanPenarikan: input.alasan,
            dibuatOleh: aktor.penggunaId,
          })
          .returning({ id: penarikanTabungan.id });
        if (!baru) throw new Error("penarikan tak tersimpan");
        await geser(tx, nasabahId, -input.nominal);
        const [hasil] = await pilihPenarikan(tx).where(eq(penarikanTabungan.id, baru.id));
        if (!hasil) throw new Error("penarikan hilang");
        return kePenarikan(hasil);
      });
    },

    /** Batal penarikan (bos, hari yang sama) — tabungan kembali sebesar nominal. */
    async batalPenarikan(aktor: Aktor, id: string, input: BatalInput) {
      wajibPeran(aktor, "bos");
      const tanggal = await hariIni(aktor);
      return deps.db.transaction(async (tx) => {
        const [p] = await tx
          .select({
            nasabahId: penarikanTabungan.nasabahId,
            tanggal: penarikanTabungan.tanggal,
            nominal: penarikanTabungan.nominal,
            dibatalkanAt: penarikanTabungan.dibatalkanAt,
          })
          .from(penarikanTabungan)
          .where(and(eq(penarikanTabungan.id, id), eq(penarikanTabungan.kantorId, aktor.kantorId)))
          .for("update");
        if (!p) throw tidakDitemukan("PENARIKAN_TIDAK_DITEMUKAN", "Penarikan tidak ditemukan");
        if (p.dibatalkanAt) throw sudahDibatalkan();
        if (p.tanggal !== tanggal) throw batalHanyaHariIni();
        await kunciNasabah(tx, aktor, p.nasabahId);
        await tx
          .update(penarikanTabungan)
          .set({
            dibatalkanAt: sekarang(),
            dibatalkanOleh: aktor.penggunaId,
            alasanBatal: input.alasan,
          })
          .where(eq(penarikanTabungan.id, id));
        await geser(tx, p.nasabahId, p.nominal);
        const [hasil] = await pilihPenarikan(tx).where(eq(penarikanTabungan.id, id));
        if (!hasil) throw new Error("penarikan hilang");
        return kePenarikan(hasil);
      });
    },

    /** Riwayat penarikan satu nasabah (bos, pengawas), terbaru dulu. */
    async daftarPenarikan(aktor: Aktor, nasabahId: string) {
      wajibPeran(aktor, "bos", "pengawas");
      await pastikanNasabah(aktor, nasabahId);
      const baris = await pilihPenarikan(deps.db)
        .where(eq(penarikanTabungan.nasabahId, nasabahId))
        .orderBy(desc(penarikanTabungan.dibuatAt));
      return baris.map(kePenarikan);
    },

    // ---- koreksi ---------------------------------------------------------------

    /** Koreksi angka tabungan (bos) — selisih dicatat; saldo wajar ≤ 5 × pokok terakhir. */
    async koreksi(aktor: Aktor, nasabahId: string, input: KoreksiInput) {
      wajibPeran(aktor, "bos");
      const tanggal = await hariIni(aktor);
      return deps.db.transaction(async (tx) => {
        const n = await kunciNasabah(tx, aktor, nasabahId);
        const [terakhir] = await tx
          .select({ pokok: pinjaman.pokok })
          .from(pinjaman)
          .where(and(eq(pinjaman.nasabahId, nasabahId), ne(pinjaman.status, "batal")))
          .orderBy(desc(pinjaman.pinjamanKe))
          .limit(1);
        const selisih = hitungKoreksi({
          saldoBaru: input.saldoBaru,
          saldoSebelum: input.saldoSebelum,
          saldoSekarang: n.saldoTabungan,
          pokokTerakhir: terakhir?.pokok ?? null,
        });
        const [baru] = await tx
          .insert(koreksiTabungan)
          .values({
            kantorId: aktor.kantorId,
            nasabahId,
            tanggal,
            saldoSebelum: n.saldoTabungan,
            selisih,
            alasanKoreksi: input.alasan,
            dibuatOleh: aktor.penggunaId,
          })
          .returning({ id: koreksiTabungan.id });
        if (!baru) throw new Error("koreksi tak tersimpan");
        await geser(tx, nasabahId, selisih);
        const [hasil] = await pilihKoreksi(tx).where(eq(koreksiTabungan.id, baru.id));
        if (!hasil) throw new Error("koreksi hilang");
        return keKoreksi(hasil);
      });
    },

    /** Riwayat koreksi satu nasabah (bos, pengawas), terbaru dulu. */
    async daftarKoreksi(aktor: Aktor, nasabahId: string) {
      wajibPeran(aktor, "bos", "pengawas");
      await pastikanNasabah(aktor, nasabahId);
      const baris = await pilihKoreksi(deps.db)
        .where(eq(koreksiTabungan.nasabahId, nasabahId))
        .orderBy(desc(koreksiTabungan.dibuatAt));
      return baris.map(keKoreksi);
    },
  };
}

export type LayananTabungan = ReturnType<typeof buatLayananTabungan>;
