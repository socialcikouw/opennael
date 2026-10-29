import { describe, expect, test } from "bun:test";
import type { Sesi } from "@opennael/contracts";
import { geserTanggal } from "@opennael/domain";
import { sql } from "drizzle-orm";
import { buatApp } from "../../../app";
import { dalamTransaksi, KODE_REG, RAHASIA, siapkanKantor, URL_DB } from "../../../uji/bantu";
import { pengirimLapangan } from "../../../uji/lapangan";
import { kalenderGerbang, VALIDASI_PENUH } from "./kalender";

describe("kalender gerbang", () => {
  const kal = {
    tanggal: "2026-10-26",
    dalamJamKerja: false,
    hariKerja: false,
    liburKantor: "Maulid",
  };

  test("semua diperiksa: kalender apa adanya", () => {
    expect(kalenderGerbang(kal, VALIDASI_PENUH)).toEqual(kal);
  });

  test("tiap saklar hanya melonggarkan pemeriksaannya sendiri", () => {
    expect(kalenderGerbang(kal, { ...VALIDASI_PENUH, jamKerja: false })).toEqual({
      ...kal,
      dalamJamKerja: true,
    });
    expect(kalenderGerbang(kal, { ...VALIDASI_PENUH, hariKerja: false })).toEqual({
      ...kal,
      hariKerja: true,
    });
    expect(kalenderGerbang(kal, { ...VALIDASI_PENUH, liburKantor: false })).toEqual({
      ...kal,
      liburKantor: null,
    });
    // Tanggal pembukuan tidak pernah ikut berubah.
    expect(
      kalenderGerbang(kal, { jamKerja: false, hariKerja: false, liburKantor: false }).tanggal,
    ).toBe("2026-10-26");
  });
});

/** Pekan kerja & libur kantor oleh bos, kalender sebulan — di SATU transaksi yang dibatalkan. */
describe.skipIf(!URL_DB)("kalender kantor", () => {
  test("pekan kerja: bertanggal, tak boleh mundur, tanggal sama ditimpa", async () => {
    await dalamTransaksi(async (tx) => {
      const { kirim, bos, kolektor: andi, kantorId } = await siapkanKantor(tx);
      const b = bos.tokenAkses;
      const k = andi.tokenAkses;
      const kode = (r: { isi: Record<string, unknown> }) => r.isi.kode;
      const baris = async <T>(q: ReturnType<typeof sql>) => (await tx.execute(q)) as unknown as T[];
      const [hariIni] = await baris<{ t: string }>(
        sql`select kantor_hari_ini(${kantorId})::text as t`,
      );
      const hari = hariIni?.t as string;
      const aksi = async (tabel: string) =>
        (
          await baris<{ aksi: string }>(sql`
            select aksi from riwayat_perubahan where kantor_id = ${kantorId} and tabel = ${tabel}
            order by dibuat_at`)
        ).map((r) => r.aksi);

      // ---- pekan kerja (bertanggal, tak mundur, tanggal sama ditimpa) ----------------------
      const pekan = (isi: Record<string, unknown>) =>
        kirim("/kantor/pekan-kerja", { metode: "PUT", isi, token: b });
      const minggudepan = geserTanggal(hari, 7);
      expect(kode(await pekan({ hariKerja: [1, 2], berlakuMulai: geserTanggal(hari, -1) }))).toBe(
        "TIDAK_BOLEH_MUNDUR",
      );
      expect(kode(await pekan({ hariKerja: [1, 1] }))).toBe("VALIDASI");
      await pekan({ hariKerja: [1, 2, 3, 4, 5], berlakuMulai: minggudepan });
      const ditimpa = await pekan({ hariKerja: [1, 2, 3, 4, 5, 6], berlakuMulai: minggudepan });
      expect(ditimpa.isi).toMatchObject({
        berlakuMulai: minggudepan,
        hariKerja: [1, 2, 3, 4, 5, 6],
      });
      const riwayatPekan = (await kirim("/kantor/pekan-kerja", { token: b })).isi;
      expect(riwayatPekan.map((p: { berlakuMulai: string }) => p.berlakuMulai)).toEqual([
        minggudepan,
        hari,
      ]);
      expect(await aksi("pekan_kerja")).toEqual(["timpa_pekan_kerja"]);
      // Hari ini tetap memakai pola lama.
      expect((await kirim("/kantor", { token: k })).isi.hariKerja).toHaveLength(7);
    });
  }, 60_000);

  test("libur kantor: deklarasi, rentang, hari berjalan, batal, jejak", async () => {
    await dalamTransaksi(async (tx) => {
      const { kirim, bos, kolektor: andi, kantorId } = await siapkanKantor(tx);
      const b = bos.tokenAkses;
      const k = andi.tokenAkses;
      const andiId = andi.pengguna.id;
      const kode = (r: { isi: Record<string, unknown> }) => r.isi.kode;
      const baris = async <T>(q: ReturnType<typeof sql>) => (await tx.execute(q)) as unknown as T[];
      const [hariIni] = await baris<{ t: string }>(
        sql`select kantor_hari_ini(${kantorId})::text as t`,
      );
      const hari = hariIni?.t as string;
      const besok = geserTanggal(hari, 1);
      const aksi = async (tabel: string) =>
        (
          await baris<{ aksi: string }>(sql`
            select aksi from riwayat_perubahan where kantor_id = ${kantorId} and tabel = ${tabel}
            order by dibuat_at`)
        ).map((r) => r.aksi);

      // Kolektor sudah absen dan punya pinjaman salinan agar hari ini bisa "berjalan".
      await kirim("/lapangan/absen", {
        isi: { absensi: "masuk_kerja", kasLapangan: 0, uangJalan: 0 },
        token: k,
      });
      const [w] = await baris<{ id: string }>(sql`
        insert into wilayah (kantor_id, nama, dibuat_oleh) values (${kantorId}, 'Pule', ${andiId})
        returning id`);
      const [n] = await baris<{ id: string }>(sql`
        insert into nasabah (kantor_id, kolektor_id, nama, wilayah_id) values (${kantorId}, ${andiId}, 'Sari', ${w?.id})
        returning id`);
      // ---- libur kantor ------------------------------------------------------------------
      const libur = (isi: Record<string, unknown>) => kirim("/libur-kantor", { isi, token: b });
      expect(
        (
          await libur({
            tanggalMulai: besok,
            tanggalSelesai: geserTanggal(hari, 3),
            alasan: "Lebaran",
          })
        ).isi,
      ).toEqual({
        ditambah: [besok, geserTanggal(hari, 2), geserTanggal(hari, 3)],
        dilewati: [],
      });
      expect(
        (
          await libur({
            tanggalMulai: geserTanggal(hari, 3),
            tanggalSelesai: geserTanggal(hari, 4),
            alasan: "Lebaran",
          })
        ).isi,
      ).toEqual({ ditambah: [geserTanggal(hari, 4)], dilewati: [geserTanggal(hari, 3)] });
      expect(kode(await libur({ tanggalMulai: geserTanggal(hari, -1), alasan: "x" }))).toBe(
        "TIDAK_BOLEH_MUNDUR",
      );
      expect(
        kode(
          await libur({ tanggalMulai: besok, tanggalSelesai: geserTanggal(hari, 40), alasan: "x" }),
        ),
      ).toBe("RENTANG_TERLALU_PANJANG");
      // Hari ini sudah berjalan (ada setoran) → tak bisa diliburkan.
      const [p] = await baris<{ id: string }>(sql`
        insert into pinjaman (kantor_id, pencair_id, dibuat_oleh, nasabah_id, pinjaman_ke, jenis, tenor,
          asal, tanggal_akad, tanggal_disalin, pokok, potongan_admin, tabungan_masuk, pencairan,
          total_kembali, angsuran, saldo_awal, drop_baru, saldo)
        values (${kantorId}, ${andiId}, ${bos.pengguna.id}, ${n?.id}, 1, 'harian', 24, 'migrasi',
          '2026-08-01', '2026-09-01', 1000000, 0, 0, 0, 1200000, 50000, 900000, 0, 900000) returning id`);
      expect(
        (
          await kirim("/lapangan/bayar", {
            isi: { pinjamanId: p?.id, setoranMurni: 50_000 },
            token: k,
          })
        ).status,
      ).toBe(201);
      expect(kode(await libur({ tanggalMulai: hari, alasan: "acara" }))).toBe(
        "LIBUR_KANTOR_HARI_SUDAH_BERJALAN",
      );
      expect((await kirim("/libur-kantor", { token: k })).isi).toHaveLength(4);
      const batalLibur = (tanggal: string) =>
        kirim(`/libur-kantor/${tanggal}/batal`, { isi: { alasan: "jadi masuk" }, token: b });
      expect((await batalLibur(besok)).isi).toEqual({ tanggal: besok, alasan: "Lebaran" });
      expect(kode(await batalLibur(besok))).toBe("LIBUR_TIDAK_DITEMUKAN");
      expect(kode(await batalLibur(hari))).toBe("HANYA_LIBUR_BELUM_TIBA");
      expect(await aksi("libur_kantor")).toEqual([
        "deklarasi_libur_kantor",
        "deklarasi_libur_kantor",
        "deklarasi_libur_kantor",
        "deklarasi_libur_kantor",
        "batal_libur_kantor",
      ]);
    });
  }, 60_000);

  test("kalender bulan: hari tagih pola pekan & libur kantor (grid kartu)", async () => {
    await dalamTransaksi(async (tx) => {
      const kirim = pengirimLapangan(buatApp({ db: tx, ...RAHASIA, kodeRegistrasi: KODE_REG }));
      const bos = (
        await kirim("/auth/register", {
          kodeRegistrasi: KODE_REG,
          namaKantor: "Kantor Kalender",
          nama: "Bos",
          nomorHp: "081299990012",
          sandi: "sandi-rahasia-uji",
        })
      ).isi as Sesi;
      const kantorId = bos.pengguna.kantor.id;
      // Pekan kerja bawaan kantor baru: Senin–Sabtu (B2). Libur kantor Kamis 5 Nov.
      await tx.execute(sql`
        insert into libur_kantor (kantor_id, tanggal, alasan_libur, dibuat_oleh)
        values (${kantorId}, '2026-11-05', 'Rapat', ${bos.pengguna.id})`);
      const r = await kirim("/lapangan/kalender?bulan=2026-11", undefined, bos.tokenAkses);
      expect(r.status).toBe(200);
      // November 2026: 30 hari, 5 Minggu → 25 hari kerja, dikurangi 1 libur kantor.
      expect(r.isi.hariTagih).toHaveLength(24);
      expect(r.isi.hariTagih).not.toContain("2026-11-01"); // Minggu
      expect(r.isi.hariTagih).not.toContain("2026-11-05"); // libur kantor
      expect(r.isi.hariTagih).toContain("2026-11-30");
      expect(r.isi.liburKantor).toEqual([{ tanggal: "2026-11-05", alasan: "Rapat" }]);
      expect(
        (await kirim("/lapangan/kalender?bulan=2026-13", undefined, bos.tokenAkses)).status,
      ).toBe(400);
    });
  }, 60_000);
});
