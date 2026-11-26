import { describe, expect, test } from "bun:test";
import { eq, sql } from "drizzle-orm";
import { dalamTransaksi, masukKerja, siapkanKantor, URL_DB } from "../../uji/bantu";
import { pinjaman } from "./skema";
import { batasTempoTempoan, hariTempoTempoan, jatuhTempoTempoan } from "./tempo";

/**
 * Jatuh tempo tempoan dari absen (aturan-usaha A4) — di SATU transaksi yang dibatalkan.
 * Hanya hari MASUK KERJA pemegang SESUDAH hari akad yang dihitung: ke-6 jatuh tempo,
 * ke-10 batas lunas; pindah pemegang = absen pemegang baru.
 */
describe.skipIf(!URL_DB)("jatuh tempo tempoan dari absen", () => {
  test("hari ke-6 jatuh tempo, ke-10 batas lunas, hari tidak kerja & kolektor lain tak dihitung", async () => {
    await dalamTransaksi(async (tx) => {
      const { bos, kolektor: andi, kantorId } = await siapkanKantor(tx);
      const andiId = andi.pengguna.id;
      const baris = async <T>(q: ReturnType<typeof sql>) => (await tx.execute(q)) as unknown as T[];
      const [dedi] = await baris<{ id: string }>(sql`
        insert into pengguna (kantor_id, peran, nama) values (${kantorId}, 'kolektor', 'dedi')
        returning id`);
      const dediId = dedi?.id as string;
      const [w] = await baris<{ id: string }>(sql`
        insert into wilayah (kantor_id, nama, dibuat_oleh) values (${kantorId}, 'pule', ${andiId})
        returning id`);
      const pinjamanBaru = async (nama: string, jenis: "tempoan" | "harian") => {
        const [n] = await baris<{ id: string }>(sql`
          insert into nasabah (kantor_id, kolektor_id, nama, wilayah_id)
          values (${kantorId}, ${andiId}, ${nama}, ${w?.id}) returning id`);
        const tempoan = jenis === "tempoan";
        const [p] = await baris<{ id: string }>(sql`
          insert into pinjaman (kantor_id, pencair_id, dibuat_oleh, nasabah_id, pinjaman_ke, jenis, tenor,
            asal, tanggal_akad, tanggal_disalin, pokok, potongan_admin, tabungan_masuk, pencairan,
            total_kembali, angsuran, saldo_awal, drop_baru, saldo)
          values (${kantorId}, ${andiId}, ${bos.pengguna.id}, ${n?.id}, 1, ${jenis}, ${tempoan ? 6 : 25},
            'migrasi', '2026-11-26', '2026-11-26', 200000, 0, 0, 0, 250000,
            ${tempoan ? 250_000 : 10_000}, 250000, 0, 250000)
          returning id`);
        return { pinjamanId: p?.id as string, nasabahId: n?.id as string };
      };
      const baca = async (id: string) =>
        (
          await tx
            .select({
              jatuhTempo: jatuhTempoTempoan(),
              batasTempo: batasTempoTempoan(),
              hariTempo: hariTempoTempoan(),
            })
            .from(pinjaman)
            .where(eq(pinjaman.id, id))
        )[0];

      // Budi akad tempoan Kamis 26 Nov (contoh A4).
      const budi = await pinjamanBaru("budi", "tempoan");
      const sari = await pinjamanBaru("sari", "harian");
      expect(await baca(budi.pinjamanId)).toEqual({
        jatuhTempo: null,
        batasTempo: null,
        hariTempo: 0,
      });

      // Hari akad sendiri tak dihitung; Senin 30 Nov Andi tidak kerja; Minggu tak ada absen.
      await masukKerja(tx, kantorId, andiId, ["2026-11-26", "2026-11-27", "2026-11-28"]);
      await tx.execute(sql`
        insert into hari_kolektor (kantor_id, kolektor_id, tanggal, absensi, alasan_tidak_kerja)
        values (${kantorId}, ${andiId}, '2026-11-30', 'tidak_kerja', 'sakit')`);
      await masukKerja(tx, kantorId, andiId, ["2026-12-01", "2026-12-02", "2026-12-03"]);
      // Dedi bekerja setiap hari — bukan pemegang Budi, tak dihitung.
      await masukKerja(tx, kantorId, dediId, [
        "2026-11-27",
        "2026-11-28",
        "2026-11-30",
        "2026-12-01",
        "2026-12-02",
        "2026-12-03",
        "2026-12-04",
      ]);
      expect(await baca(budi.pinjamanId)).toEqual({
        jatuhTempo: null,
        batasTempo: null,
        hariTempo: 5,
      });

      // Jumat 4 Des = hari masuk kerja ke-6 → jatuh tempo (bergeser sehari karena Senin).
      await masukKerja(tx, kantorId, andiId, ["2026-12-04", "2026-12-05", "2026-12-07"]);
      expect(await baca(budi.pinjamanId)).toEqual({
        jatuhTempo: "2026-12-04",
        batasTempo: null,
        hariTempo: 8,
      });
      await masukKerja(tx, kantorId, andiId, ["2026-12-08", "2026-12-09", "2026-12-10"]);
      expect(await baca(budi.pinjamanId)).toEqual({
        jatuhTempo: "2026-12-04",
        batasTempo: "2026-12-09",
        hariTempo: 11,
      });

      // Bukan tempoan: kosong.
      expect(await baca(sari.pinjamanId)).toEqual({
        jatuhTempo: null,
        batasTempo: null,
        hariTempo: 0,
      });

      // Pindah pemegang ke Dedi: absen Dedi yang dihitung (masuk 27 Nov … 4 Des = 7 hari).
      await tx.execute(
        sql`update nasabah set kolektor_id = ${dediId} where id = ${budi.nasabahId}`,
      );
      expect(await baca(budi.pinjamanId)).toEqual({
        jatuhTempo: "2026-12-03",
        batasTempo: null,
        hariTempo: 7,
      });
    });
  }, 60_000);
});
