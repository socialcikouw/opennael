import { describe, expect, test } from "bun:test";
import type { Sesi } from "@opennael/contracts";
import { sql } from "drizzle-orm";
import { buatApp } from "../../app";
import { dalamTransaksi, KODE_REG, RAHASIA, URL_DB } from "../../uji/bantu";
import { pengirimLapangan } from "../../uji/lapangan";

describe.skipIf(!URL_DB)("gerbang lapangan", () => {
  test("saklar VALIDASI_* mematikan pemeriksaan kalender gerbang satu per satu", async () => {
    await dalamTransaksi(async (tx) => {
      const app = (validasiKalender?: {
        jamKerja: boolean;
        hariKerja: boolean;
        liburKantor: boolean;
      }) =>
        pengirimLapangan(
          buatApp({ db: tx, ...RAHASIA, kodeRegistrasi: KODE_REG, validasiKalender }),
        );
      const ketat = app();
      const bos = (
        await ketat("/auth/register", {
          kodeRegistrasi: KODE_REG,
          namaKantor: "Kantor Saklar",
          nama: "Bos",
          nomorHp: "081299990011",
          sandi: "sandi-rahasia-uji",
        })
      ).isi as Sesi;
      const kantorId = bos.pengguna.kantor.id;
      const t = await ketat("/auth/tautan", {});
      await ketat(
        "/auth/tautan/setujui",
        { kode: t.isi.kode, akun: { peran: "kolektor", nama: "Budi" } },
        bos.tokenAkses,
      );
      const k = (
        (await ketat(`/auth/tautan/${t.isi.id}/klaim`, { klaim: t.isi.klaim })).isi as Sesi
      ).tokenAkses;
      const absen = (kirim: ReturnType<typeof pengirimLapangan>) =>
        kirim("/lapangan/absen", { absensi: "masuk_kerja", kasLapangan: 0, uangJalan: 0 }, k);

      // Jam kerja setengah jam di paruh hari yang lain — pasti di luar jam sekarang.
      const jamWib = (new Date().getUTCHours() + 7) % 24;
      const [buka, tutup] = jamWib < 12 ? ["23:00", "23:30"] : ["01:00", "01:30"];
      // Pola pekan kerja tanpa hari ini (bit 0 = Minggu).
      const bukanHariIni = 127 & ~(1 << new Date(Date.now() + 7 * 3_600_000).getUTCDay());
      await tx.execute(
        sql`update kantor set jam_buka = ${buka}, jam_tutup = ${tutup} where id = ${kantorId}`,
      );

      // Bawaan (VPS): di luar jam kerja ditolak, dan HP diberi tahu.
      const kalKetat = (await ketat("/lapangan/hari-ini", undefined, k)).isi.kalender;
      expect(kalKetat.dalamJamKerja).toBe(false);
      const tanggal = kalKetat.tanggal as string;
      expect((await absen(ketat)).isi.kode).toBe("DI_LUAR_JAM_KERJA");

      // Hanya jam kerja dimatikan: hari bukan hari kerja tetap ditolak …
      await tx.execute(
        sql`update pekan_kerja set hari_kerja = ${bukanHariIni} where kantor_id = ${kantorId}`,
      );
      const tanpaJam = app({ jamKerja: false, hariKerja: true, liburKantor: true });
      expect((await absen(tanpaJam)).isi.kode).toBe("BUKAN_HARI_KERJA");
      // … begitu juga libur kantor.
      await tx.execute(sql`update pekan_kerja set hari_kerja = 127 where kantor_id = ${kantorId}`);
      await tx.execute(sql`
        insert into libur_kantor (kantor_id, tanggal, alasan_libur, dibuat_oleh)
        values (${kantorId}, ${tanggal}, 'Uji libur', ${bos.pengguna.id})`);
      expect((await absen(tanpaJam)).isi.kode).toBe("LIBUR_KANTOR");

      // Semua dimatikan (laptop): absen diterima, HP melihat lapangan buka.
      const longgar = app({ jamKerja: false, hariKerja: false, liburKantor: false });
      await tx.execute(
        sql`update pekan_kerja set hari_kerja = ${bukanHariIni} where kantor_id = ${kantorId}`,
      );
      expect((await longgar("/lapangan/hari-ini", undefined, k)).isi.kalender).toMatchObject({
        tanggal,
        dalamJamKerja: true,
        hariKerja: true,
        liburKantor: null,
      });
      expect((await absen(longgar)).status).toBe(201);
      // Wajib absen tidak ikut dimatikan: absen kedua tetap ditolak.
      expect((await absen(longgar)).isi.kode).toBe("SUDAH_ABSEN");
    });
  }, 120_000);
});
