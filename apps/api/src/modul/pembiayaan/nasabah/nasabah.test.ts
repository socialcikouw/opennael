import { describe, expect, test } from "bun:test";
import { dalamTransaksi, URL_DB } from "../../../uji/bantu";
import { siapkanLapangan } from "../../../uji/lapangan";

describe.skipIf(!URL_DB)("nasabah", () => {
  test("lapangan: nasabah lama = pegangan tanpa pinjaman aktif, calon pinjam lagi", async () => {
    await dalamTransaksi(async (tx) => {
      const { kirim, k, absen, akadBaru } = await siapkanLapangan(tx);
      await absen();
      await akadBaru("sari"); // masih berpinjaman: tidak ikut
      const budi = await akadBaru("budi", { pokok: 500_000 });
      await kirim("/lapangan/lunas", { pinjamanId: budi.isi.id }, k);
      const lama = await kirim("/lapangan/nasabah-lama", undefined, k);
      expect(lama.isi).toEqual([
        {
          id: budi.isi.nasabah.id,
          nama: "budi",
          kampung: "pule barat",
          tabungan: 0,
          terakhir: { pinjamanKe: 1, jenis: "harian", pokok: 500_000 },
        },
      ]);
    });
  }, 120_000);

  test("GET /nasabah/{id}: kolektor membaca pegangannya, bos juga; id asing 404; /serupa tak tertukar", async () => {
    await dalamTransaksi(async (tx) => {
      const { kirim, k, bos, absen, akadBaru } = await siapkanLapangan(tx);
      await absen();
      const budi = await akadBaru("budi");
      const id = budi.isi.nasabah.id as string;

      const milikSendiri = await kirim(`/nasabah/${id}`, undefined, k);
      expect(milikSendiri.status).toBe(200);
      expect(milikSendiri.isi).toMatchObject({
        id,
        nama: "budi",
        kampung: { nama: "pule barat" },
        kolektor: { nama: "andi" },
        saldoTabungan: expect.any(Number),
        diblokir: false,
        pinjamanAktif: { id: budi.isi.id, status: "berjalan" },
        lokasi: null,
      });

      expect((await kirim(`/nasabah/${id}`, undefined, bos.tokenAkses)).status).toBe(200);
      expect((await kirim(`/nasabah/${crypto.randomUUID()}`, undefined, k)).status).toBe(404);
      // "serupa" tetap rute sendiri, bukan id.
      expect((await kirim("/nasabah/serupa?nama=bu", undefined, k)).status).toBe(200);
    });
  }, 120_000);
});
