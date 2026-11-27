import { describe, expect, test } from "bun:test";
import { sql } from "drizzle-orm";
import { dalamTransaksi, siapkanKantor, URL_DB } from "../../../uji/bantu";

/**
 * `GET /hari-kolektor/riwayat` — Riwayat Kas HP (28 Nov 2026): hari-hari satu kolektor,
 * terbaru dulu, dengan serah terima berlaku (yang dibatalkan tidak), satu kueri ringan.
 */
describe.skipIf(!URL_DB)("riwayat hari kolektor", () => {
  test("terbaru dulu, serah terima berlaku saja, milik sendiri, batas rentang", async () => {
    await dalamTransaksi(async (tx) => {
      const { kirim, bos, kolektor: andi, kantorId } = await siapkanKantor(tx);
      const andiId = andi.pengguna.id;
      const bosId = bos.pengguna.id;
      const kode = (r: { isi: Record<string, unknown> }) => r.isi.kode;

      // Data lampau (jalan pintas migrasi): tiga hari Andi.
      await tx.execute(sql`select set_config('nael.migrasi_data', 'ya', true)`);
      const hari = async (tanggal: string, isi: { tidakKerja?: boolean } = {}) => {
        const [h] = (await tx.execute(sql`
          insert into hari_kolektor (kantor_id, kolektor_id, tanggal, absensi, alasan_tidak_kerja,
            kas_lapangan, uang_jalan, laporan_dibuka_at)
          values (${kantorId}, ${andiId}, ${tanggal}, ${isi.tidakKerja ? "tidak_kerja" : "masuk_kerja"},
            ${isi.tidakKerja ? "sakit" : null}, ${isi.tidakKerja ? 0 : 1_000_000},
            ${isi.tidakKerja ? 0 : 50_000}, ${isi.tidakKerja ? null : sql`now()`})
          returning id`)) as unknown as { id: string }[];
        return h?.id as string;
      };
      const terima = async (hariId: string, seharusnya: number, diterima: number, batal = false) =>
        tx.execute(sql`
          insert into serah_terima_kas (kantor_id, hari_kolektor_id, tunai_seharusnya, tunai_diterima,
            diterima_oleh, dibatalkan_at, dibatalkan_oleh, alasan_batal)
          values (${kantorId}, ${hariId}, ${seharusnya}, ${diterima}, ${bosId},
            ${batal ? sql`now()` : null}, ${batal ? bosId : null}, ${batal ? "salah hitung" : null})`);
      const h2 = await hari("2026-10-02");
      await terima(h2, 2_000_000, 1_980_000);
      await hari("2026-10-03", { tidakKerja: true });
      const h5 = await hari("2026-10-05");
      await terima(h5, 1_500_000, 1_400_000, true); // dibatalkan bos → belum diterima
      await tx.execute(sql`select set_config('nael.migrasi_data', '', true)`);

      const baca = (q: string, token = andi.tokenAkses) =>
        kirim(`/hari-kolektor/riwayat?${q}`, { token });
      const r = await baca("mulai=2026-10-01&selesai=2026-10-31");
      expect(r.status).toBe(200);
      expect((r.isi as unknown as { tanggal: string }[]).map((h) => h.tanggal)).toEqual([
        "2026-10-05",
        "2026-10-03",
        "2026-10-02",
      ]);
      const [lima, tiga, dua] = r.isi as unknown as Record<string, unknown>[];
      expect(lima).toMatchObject({ absensi: "masuk_kerja", serahTerima: null, tekorLama: 0 });
      expect(typeof lima?.absenAt).toBe("string");
      expect(tiga).toMatchObject({ absensi: "tidak_kerja", alasanTidakKerja: "sakit" });
      expect(dua).toMatchObject({
        kasLapangan: 1_000_000,
        uangJalan: 50_000,
        serahTerima: {
          tunaiSeharusnya: 2_000_000,
          tunaiDiterima: 1_980_000,
          selisihSetor: -20_000,
          tekor: 20_000,
          lebihSetor: 0,
        },
      });

      // Kolektor hanya miliknya; bos wajib memilih kolektor; rentang dibatasi.
      expect(kode(await baca(`mulai=2026-10-01&selesai=2026-10-31&kolektorId=${bosId}`))).toBe(
        "BUKAN_MILIK_ANDA",
      );
      expect(kode(await baca("mulai=2026-10-01&selesai=2026-10-31", bos.tokenAkses))).toBe(
        "KOLEKTOR_WAJIB",
      );
      const bosBaca = await baca(
        `mulai=2026-10-01&selesai=2026-10-31&kolektorId=${andiId}`,
        bos.tokenAkses,
      );
      expect(bosBaca.isi).toHaveLength(3);
      expect(kode(await baca("mulai=2026-08-01&selesai=2026-10-31"))).toBe(
        "RENTANG_TERLALU_PANJANG",
      );
    });
  }, 60_000);
});
