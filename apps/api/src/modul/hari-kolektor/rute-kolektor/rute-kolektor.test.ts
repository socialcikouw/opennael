import { describe, expect, test } from "bun:test";
import { sql } from "drizzle-orm";
import { dalamTransaksi, siapkanKantor, URL_DB } from "../../../uji/bantu";

/** Rute kolektor & urutan kartu tagihan — di SATU transaksi yang dibatalkan. */
describe.skipIf(!URL_DB)("rute kolektor", () => {
  test("kartu mengikuti rute, versi basi ditolak, kampung diketik dibuat", async () => {
    await dalamTransaksi(async (tx) => {
      const { kirim, bos, kolektor: andi, kantorId } = await siapkanKantor(tx);
      const b = bos.tokenAkses;
      const k = andi.tokenAkses;
      const andiId = andi.pengguna.id;
      const kode = (r: { isi: Record<string, unknown> }) => r.isi.kode;
      const baris = async <T>(q: ReturnType<typeof sql>) => (await tx.execute(q)) as unknown as T[];

      // Pegangan Andi di tiga kampung.
      const kampung: Record<string, string> = {};
      for (const nama of ["pule", "sawah", "kebun"]) {
        const [w] = await baris<{ id: string }>(sql`
          insert into wilayah (kantor_id, nama, dibuat_oleh) values (${kantorId}, ${nama}, ${andiId})
          returning id`);
        kampung[nama] = w?.id as string;
        const [n] = await baris<{ id: string }>(sql`
          insert into nasabah (kantor_id, kolektor_id, nama, wilayah_id)
          values (${kantorId}, ${andiId}, ${`warga ${nama}`}, ${w?.id}) returning id`);
        await tx.execute(sql`
          insert into pinjaman (kantor_id, pencair_id, dibuat_oleh, nasabah_id, pinjaman_ke, jenis, tenor,
            asal, tanggal_akad, tanggal_disalin, pokok, potongan_admin, tabungan_masuk, pencairan,
            total_kembali, angsuran, saldo_awal, drop_baru, saldo)
          values (${kantorId}, ${andiId}, ${bos.pengguna.id}, ${n?.id}, 1, 'harian', 24, 'migrasi',
            '2026-08-01', '2026-09-01', 1000000, 0, 0, 0, 1200000, 50000, 900000, 0, 900000)`);
      }
      const urutanKartu = async () =>
        (await kirim("/lapangan/pinjaman", { token: k })).isi.map(
          (p: { nasabah: { kampung: string } }) => p.nasabah.kampung,
        );
      const simpan = (isi: Record<string, unknown>, token = k) =>
        kirim("/rute-kolektor", { metode: "PUT", isi, token });

      // Tanpa rute: abjad kampung.
      expect(await urutanKartu()).toEqual(["kebun", "pule", "sawah"]);
      expect((await kirim("/rute-kolektor", { token: k })).isi).toMatchObject({
        kolektorId: andiId,
        urutan: [],
        versi: 0,
      });

      // Kolektor menyusun rutenya — kampung dipilih atau diketik.
      const r1 = await simpan({
        urutan: [{ wilayahId: kampung.sawah }, { nama: " pule " }],
        versi: 0,
      });
      expect(r1.isi).toMatchObject({
        versi: 1,
        urutan: [{ nama: "sawah" }, { nama: "pule" }],
        diubahOleh: { nama: "andi" },
      });
      expect(await urutanKartu()).toEqual(["sawah", "pule", "kebun"]);
      expect(kode(await simpan({ urutan: [], versi: 0 }))).toBe("RUTE_VERSI_BASI");

      // Bos menyusun ulang; kampung kembar dipadatkan, kampung baru dibuat.
      const r2 = await simpan(
        {
          kolektorId: andiId,
          urutan: [
            { nama: "kebun" },
            { wilayahId: kampung.sawah },
            { nama: "KEBUN" },
            { nama: "ladang baru" },
          ],
          versi: 1,
        },
        b,
      );
      expect(r2.isi.urutan.map((u: { nama: string }) => u.nama)).toEqual([
        "kebun",
        "sawah",
        "ladang baru",
      ]);
      expect(r2.isi).toMatchObject({ versi: 2, diubahOleh: { nama: "bos" } });
      expect(await urutanKartu()).toEqual(["kebun", "sawah", "pule"]);
      // Layar kolektor yang masih memuat versi 1 tak menimpa susunan bos.
      expect(kode(await simpan({ urutan: [{ nama: "pule" }], versi: 1 }))).toBe("RUTE_VERSI_BASI");

      expect(kode(await kirim("/rute-kolektor", { token: b }))).toBe("KOLEKTOR_WAJIB");
      expect(kode(await kirim(`/rute-kolektor?kolektorId=${bos.pengguna.id}`, { token: k }))).toBe(
        "BUKAN_MILIK_ANDA",
      );
      expect((await kirim(`/rute-kolektor?kolektorId=${andiId}`, { token: b })).isi.versi).toBe(2);

      // Rute dikosongkan → kembali abjad.
      expect((await simpan({ urutan: [], versi: 2 })).isi).toMatchObject({ urutan: [], versi: 3 });
      expect(await urutanKartu()).toEqual(["kebun", "pule", "sawah"]);
      const jejak = await baris<{ n: number }>(sql`
        select count(*)::int as n from riwayat_perubahan where baris_id = ${andiId} and aksi = 'simpan_rute'`);
      expect(jejak[0]?.n).toBe(3);
    });
  }, 60_000);
});
