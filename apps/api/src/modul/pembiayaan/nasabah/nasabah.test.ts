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
});
