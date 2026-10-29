import { describe, expect, test } from "bun:test";
import { geserTanggal } from "@opennael/domain";
import { sql } from "drizzle-orm";
import { dalamTransaksi, type Jawaban, siapkanKantor, URL_DB } from "../../../uji/bantu";

/**
 * Peristiwa, grid bulanan, satu transaksi, Buku nasabah — ujung ke ujung.
 * Tanggal relatif terhadap hari ini kantor (T). Semua di SATU transaksi yang
 * dibatalkan.
 */
describe.skipIf(!URL_DB)("peristiwa & buku nasabah", () => {
  test("transaksi berlaku + libur, saringan & rentang, pegangan, grid, transaksi batal, buku", async () => {
    await dalamTransaksi(async (tx) => {
      const { kirim, bos, kolektor: andi, kantorId } = await siapkanKantor(tx);
      const b = bos.tokenAkses;
      const k = andi.tokenAkses;
      const andiId = andi.pengguna.id;
      const baris = async <T>(q: ReturnType<typeof sql>) => (await tx.execute(q)) as unknown as T[];
      const [hari] = await baris<{ t: string }>(
        sql`select kantor_hari_ini(${kantorId})::text as t`,
      );
      const T = hari?.t as string;
      const t = (n: number) => geserTanggal(T, n);

      const [dedi] = await baris<{ id: string }>(sql`
        insert into pengguna (kantor_id, peran, nama) values (${kantorId}, 'kolektor', 'Dedi') returning id`);
      const dediId = dedi?.id as string;
      const [w] = await baris<{ id: string }>(sql`
        insert into wilayah (kantor_id, nama, dibuat_oleh) values (${kantorId}, 'Pule', ${andiId}) returning id`);
      const orang = async (nama: string, pemegang: string) => {
        const [n] = await baris<{ id: string }>(sql`
          insert into nasabah (kantor_id, kolektor_id, nama, wilayah_id)
          values (${kantorId}, ${pemegang}, ${nama}, ${w?.id}) returning id`);
        return n?.id as string;
      };
      const pinjamanLama = async (
        nasabahId: string,
        pemegang: string,
        ke: number,
        lunas = false,
      ) => {
        const [p] = await baris<{ id: string }>(sql`
          insert into pinjaman (kantor_id, pencair_id, dibuat_oleh, nasabah_id, pinjaman_ke, jenis, tenor,
            asal, tanggal_akad, tanggal_disalin, pokok, potongan_admin, tabungan_masuk, pencairan,
            total_kembali, angsuran, saldo_awal, drop_baru, saldo, status, tanggal_selesai)
          values (${kantorId}, ${pemegang}, ${bos.pengguna.id}, ${nasabahId}, ${ke}, 'harian', 24,
            'migrasi', ${t(-40)}, ${t(-40)}, 1000000, 0, 0, 0, 1200000, 50000, 1200000, 0,
            ${lunas ? 0 : 1_100_000}, ${lunas ? "lunas" : "berjalan"}, ${lunas ? t(-10) : null})
          returning id`);
        return p?.id as string;
      };
      const setor = async (
        pinjamanId: string,
        pencatat: string,
        tanggal: string,
        isi: { jenis?: string; saldoSesudah?: number; batal?: boolean } = {},
      ) => {
        const [r] = await baris<{ id: string }>(sql`
          insert into transaksi (kantor_id, pencatat_id, pinjaman_id, tanggal, jenis, setoran_murni,
            saldo_sesudah, dibatalkan_at, dibatalkan_oleh, alasan_batal)
          values (${kantorId}, ${pencatat}, ${pinjamanId}, ${tanggal}, ${isi.jenis ?? "angsuran"}, 100000,
            ${isi.saldoSesudah ?? 1_100_000}, ${isi.batal ? sql`now()` : null},
            ${isi.batal ? bos.pengguna.id : null}, ${isi.batal ? "Salah ketik" : null})
          returning id`);
        return r?.id as string;
      };

      // A (pegangan Andi): pinjaman ke-1 lunas, ke-2 berjalan.
      const a = await orang("Ani", andiId);
      const a1 = await pinjamanLama(a, andiId, 1, true);
      const a2 = await pinjamanLama(a, andiId, 2);
      await setor(a1, andiId, t(-35));
      await setor(a1, andiId, t(-10), { jenis: "pelunasan", saldoSesudah: 0 });
      const dibatalkan = await setor(a2, andiId, t(-3), { batal: true });
      await tx.execute(sql`
        insert into libur_nasabah (kantor_id, pencatat_id, pinjaman_id, tanggal, alasan_libur)
        values (${kantorId}, ${andiId}, ${a2}, ${t(-2)}, 'Sakit')`);
      const a2Setor = await setor(a2, andiId, t(-1));
      // C (pegangan Dedi).
      const c = await orang("Citra", dediId);
      const c1 = await pinjamanLama(c, dediId, 1);
      const cSetor = await setor(c1, dediId, t(-1));

      // Satu pinjaman: libur + angsuran berlaku; yang dibatalkan tidak ikut.
      const satuPinjaman = await kirim(`/transaksi/peristiwa?pinjamanId=${a2}`, { token: b });
      expect(satuPinjaman.status).toBe(200);
      expect(satuPinjaman.isi).toMatchObject([
        {
          tanggal: t(-2),
          kategori: "libur",
          storting: 0,
          saldoSesudah: null,
          alasanLibur: "Sakit",
          nasabah: { id: a, nama: "Ani" },
          pencatat: { id: andiId, nama: "Andi" },
        },
        {
          id: a2Setor,
          tanggal: t(-1),
          kategori: "angsuran",
          setoranMurni: 100_000,
          alasanLibur: null,
        },
      ]);

      // Tanpa pinjaman: wajib bertanggal, ≤ 62 hari, mulai ≤ selesai.
      const kodeRentang = async (q: string) =>
        (await kirim(`/transaksi/peristiwa${q}`, { token: b })).isi.kode;
      expect(await kodeRentang("")).toBe("RENTANG_TIDAK_SAH");
      expect(await kodeRentang(`?tanggalMulai=${t(-62)}&tanggalSelesai=${T}`)).toBe(
        "RENTANG_TIDAK_SAH",
      );
      expect(await kodeRentang(`?tanggalMulai=${T}&tanggalSelesai=${t(-1)}`)).toBe(
        "RENTANG_TIDAK_SAH",
      );

      // Rentang: bos melihat semua, kolektor hanya pegangannya.
      const rentang = `?tanggalMulai=${t(-3)}&tanggalSelesai=${T}`;
      const id = (r: Jawaban) => r.isi.map((p: { id: string }) => p.id);
      const semua = await kirim(`/transaksi/peristiwa${rentang}`, { token: b });
      expect(semua.isi).toHaveLength(3);
      expect(id(semua)).toContain(cSetor);
      const milikAndi = await kirim(`/transaksi/peristiwa${rentang}`, { token: k });
      expect(milikAndi.isi.map((p: { pinjamanId: string }) => p.pinjamanId)).toEqual([a2, a2]);
      expect(
        (await kirim(`/transaksi/peristiwa${rentang}&kolektorId=${dediId}`, { token: k })).status,
      ).toBe(403);
      expect(
        (await kirim(`/transaksi/peristiwa${rentang}&jenis=tempoan`, { token: b })).isi,
      ).toEqual([]);
      expect(
        id(await kirim(`/transaksi/peristiwa?tanggal=${t(-1)}&kolektorId=${dediId}`, { token: b })),
      ).toEqual([cSetor]);

      // Grid satu bulan (bulan kemarin): semua peristiwa berlaku pegangan Andi di bulan itu.
      const bulan = t(-1).slice(0, 7);
      const grid = await kirim(`/transaksi/rekap-bulanan?bulan=${bulan}`, { token: k });
      expect(grid.status).toBe(200);
      const harapan = [
        { pinjamanId: a1, tanggal: t(-35), kategori: "angsuran" },
        { pinjamanId: a1, tanggal: t(-10), kategori: "pelunasan" },
        { pinjamanId: a2, tanggal: t(-2), kategori: "libur" },
        { pinjamanId: a2, tanggal: t(-1), kategori: "angsuran" },
      ].filter((s) => s.tanggal.startsWith(bulan));
      expect(grid.isi).toEqual(harapan);
      expect((await kirim("/transaksi/rekap-bulanan?bulan=2026-13", { token: b })).status).toBe(
        400,
      );

      // Satu transaksi: yang dibatalkan tetap terbaca bersama pembatalnya.
      const batal = await kirim(`/transaksi/${dibatalkan}`, { token: b });
      expect(batal.isi).toMatchObject({
        id: dibatalkan,
        pencatat: { id: andiId, nama: "Andi" },
        dibatalkan: { oleh: { id: bos.pengguna.id, nama: "Bos" }, alasan: "Salah ketik" },
      });
      expect((await kirim(`/transaksi/${a2Setor}`, { token: k })).isi.dibatalkan).toBeNull();
      expect((await kirim(`/transaksi/${cSetor}`, { token: k })).isi.kode).toBe(
        "BUKAN_PEGANGAN_ANDA",
      );
      expect(
        (await kirim("/transaksi/00000000-0000-4000-8000-000000000000", { token: b })).status,
      ).toBe(404);

      // Buku nasabah: identitas, pinjaman urut ke-, semua peristiwa berlaku urut tanggal.
      const buku = await kirim(`/nasabah/${a}/buku`, { token: k });
      expect(buku.status).toBe(200);
      expect(buku.isi.nasabah).toMatchObject({ id: a, nama: "Ani" });
      expect(buku.isi.pinjaman.map((p: { id: string }) => p.id)).toEqual([a1, a2]);
      expect(
        buku.isi.peristiwa.map((p: { tanggal: string; kategori: string }) => [
          p.tanggal,
          p.kategori,
        ]),
      ).toEqual([
        [t(-35), "angsuran"],
        [t(-10), "pelunasan"],
        [t(-2), "libur"],
        [t(-1), "angsuran"],
      ]);
      expect((await kirim(`/nasabah/${c}/buku`, { token: k })).isi.kode).toBe(
        "BUKAN_PEGANGAN_ANDA",
      );
      expect((await kirim(`/nasabah/${c}/buku`, { token: b })).isi.peristiwa).toHaveLength(1);
    });
  }, 60_000);
});
