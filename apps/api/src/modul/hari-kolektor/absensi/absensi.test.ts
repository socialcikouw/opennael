import { describe, expect, test } from "bun:test";
import { sql } from "drizzle-orm";
import { hariKolektor } from "../../../platform/db/skema";
import { dalamTransaksi, URL_DB } from "../../../uji/bantu";
import { kode, siapkanDuaKoneksi, siapkanLapangan } from "../../../uji/lapangan";
import { buatLayananAbsensi } from "./layanan";

/** Absensi kolektor & buka laporan, ujung ke ujung. */
describe.skipIf(!URL_DB)("absensi kolektor", () => {
  test("peran, belum absen, absen sekali sehari, keadaan hari ini", async () => {
    await dalamTransaksi(async (tx) => {
      const { kirim, bos, k, akadBaru } = await siapkanLapangan(tx);
      expect(kode(await kirim("/lapangan/hari-ini", undefined, bos.tokenAkses))).toBe(
        "PERAN_DILARANG",
      );
      expect(kode(await akadBaru("Sari"))).toBe("BELUM_ABSEN");
      expect((await kirim("/lapangan/hari-ini", undefined, k)).isi.hari).toBeNull();
      const hasil = await kirim(
        "/lapangan/absen",
        { absensi: "masuk_kerja", kasLapangan: 1_000_000, uangJalan: 50_000 },
        k,
      );
      expect(hasil.status).toBe(201);
      expect(hasil.isi).toMatchObject({
        absensi: "masuk_kerja",
        kasLapangan: 1_000_000,
        laporanDibukaAt: null,
      });
      expect(
        kode(await kirim("/lapangan/absen", { absensi: "tidak_kerja", alasan: "sakit" }, k)),
      ).toBe("SUDAH_ABSEN");

      expect((await kirim("/lapangan/hari-ini", undefined, k)).isi.hari).toMatchObject({
        absensi: "masuk_kerja",
      });
    });
  }, 120_000);

  test("libur kantor menahan lapangan; buka laporan menghentikannya", async () => {
    await dalamTransaksi(async (tx) => {
      const { kirim, bos, k, kantorId, absen, akadBaru } = await siapkanLapangan(tx);
      await absen();
      const sari = await akadBaru("Sari");
      const pSari = sari.isi.id as string;
      await kirim("/lapangan/bayar", { pinjamanId: pSari, setoranMurni: 50_000 }, k);
      const wati = await akadBaru("Wati", { jenis: "tempoan", tenor: 14 });

      const hariIni = await kirim("/lapangan/hari-ini", undefined, k);
      await tx.execute(sql`insert into libur_kantor (kantor_id, tanggal, alasan_libur, dibuat_oleh)
                           values (${kantorId}, ${hariIni.isi.kalender.tanggal}, 'Acara', ${bos.pengguna.id})`);
      expect(
        kode(await kirim("/lapangan/bayar", { pinjamanId: wati.isi.id, setoranMurni: 50_000 }, k)),
      ).toBe("LIBUR_KANTOR");
      await tx.execute(sql`select set_config('nael.hapus_data_uji', 'ya', true)`);
      await tx.execute(sql`delete from libur_kantor where kantor_id = ${kantorId}`);
      const laporan = await kirim("/lapangan/laporan", {}, k);
      expect(laporan.status).toBe(200);
      expect(laporan.isi.laporanDibukaAt).not.toBeNull();
      expect(
        kode(await kirim("/lapangan/bayar", { pinjamanId: pSari, setoranMurni: 50_000 }, k)),
      ).toBe("LAPORAN_SUDAH_DIBUKA");
    });
  }, 120_000);

  test("dua koneksi: buka laporan menunggu kunci baris hari kolektor", async () => {
    const hari = "2026-10-29";
    const f = await siapkanDuaKoneksi("Uji kunci absensi", [hari]);
    try {
      const layanan = buatLayananAbsensi({
        db: f.db,
        sekarang: () => new Date(`${hari}T03:00:00Z`),
        validasiKalender: { jamKerja: false, hariKerja: false, liburKantor: false },
      });
      // Baris diubah koneksi lain saat buka laporan menunggu kunci: ia harus membaca
      // keadaan yang sudah di-commit, bukan keadaan yang dilihatnya sebelum menunggu.
      const mengubah = await f.tahan(hari, (tx) =>
        tx
          .update(hariKolektor)
          .set({ absensi: "tidak_kerja", alasanTidakKerja: "sakit" })
          .where(f.milik(hari)),
      );
      const buka = layanan.bukaLaporan(f.aktor).catch((e: unknown) => e);
      await f.tunggu(1500);
      mengubah.lepas();
      await mengubah.selesai;
      expect(await buka).toMatchObject({ kode: "TIDAK_KERJA_HARI_INI" });
    } finally {
      await f.bersihkan();
    }
  }, 60_000);
});
