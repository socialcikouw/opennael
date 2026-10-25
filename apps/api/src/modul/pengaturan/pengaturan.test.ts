import { describe, expect, test } from "bun:test";
import { geserTanggal } from "@opennael/domain";
import { sql } from "drizzle-orm";
import { dalamTransaksi, siapkanKantor, URL_DB } from "../../uji/bantu";

/** Pengaturan kantor oleh bos — di SATU transaksi yang dibatalkan. */
describe.skipIf(!URL_DB)("pengaturan kantor", () => {
  test("kantor, pekan kerja, rem tiga lapis, libur kantor, tarif gaji", async () => {
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

      // ---- kantor --------------------------------------------------------------------
      expect((await kirim("/kantor", { token: k })).isi).toMatchObject({
        zonaWaktu: "WIB",
        hariKerja: [0, 1, 2, 3, 4, 5, 6],
        jamBuka: "00:00",
        jamTutup: "24:00",
      });
      const ubahKantor = (isi: Record<string, unknown>, token = b) =>
        kirim("/kantor", { metode: "PATCH", isi, token });
      expect(kode(await ubahKantor({ nama: "x" }, k))).toBe("PERAN_DILARANG");
      expect(kode(await ubahKantor({ jamBuka: "23:00", jamTutup: "22:00" }))).toBe("JAM_TIDAK_SAH");
      expect((await ubahKantor({ nama: "Nael Pule", jamBuka: "00:00" })).isi.nama).toBe(
        "Nael Pule",
      );
      const [jejakKantor] = await baris<{ sesudah: Record<string, unknown> }>(sql`
        select sesudah from riwayat_perubahan where kantor_id = ${kantorId} and aksi = 'ubah_kantor'`);
      expect(jejakKantor?.sesudah).toEqual({ nama: "Nael Pule" });

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

      // ---- rem tiga lapis --------------------------------------------------------------
      const rem = (jalur: string, isi: Record<string, unknown>, token = b) =>
        kirim(`/kebijakan/${jalur}`, { metode: "PUT", isi, token });
      const mati = {
        pinjamanBaruDikunci: false,
        naikPinjamanDikunci: false,
        gulungPinjamanDikunci: false,
      };
      expect(kode(await rem("kantor", mati, k))).toBe("PERAN_DILARANG");
      await rem("kantor", { ...mati, pinjamanBaruDikunci: true, alasanKunci: "akhir bulan" });
      await rem(`kolektor/${andiId}`, {
        ...mati,
        gulungPinjamanDikunci: true,
        alasanKunci: "Andi dievaluasi",
      });
      // Kolektor melihat gabungan kantor + dirinya; alasan dari lapis paling spesifik.
      expect((await kirim("/kebijakan", { token: k })).isi).toEqual({
        pinjamanBaruDikunci: true,
        naikPinjamanDikunci: false,
        gulungPinjamanDikunci: true,
        alasanKunci: "Andi dievaluasi",
      });
      // Bos melihat lapis kantor saja.
      expect((await kirim("/kebijakan", { token: b })).isi).toMatchObject({
        pinjamanBaruDikunci: true,
        gulungPinjamanDikunci: false,
        alasanKunci: "akhir bulan",
      });
      // Rem dipakai lapangan: akad baru ditolak.
      await kirim("/lapangan/absen", {
        isi: { absensi: "masuk_kerja", kasLapangan: 0, uangJalan: 0 },
        token: k,
      });
      const [foto] = await baris<{ id: string }>(sql`
        insert into foto (kantor_id, jenis, kunci_berkas, sha256, ukuran_byte, tipe_mime, diunggah_oleh)
        values (${kantorId}, 'serah_terima', 'f', ${"d".repeat(64)}, 1000, 'image/webp', ${andiId})
        returning id`);
      const akad = await kirim("/lapangan/akad", {
        isi: {
          nasabah: { nama: "Rina", kampung: { nama: "Pule" } },
          jenis: "harian",
          pokok: 1_000_000,
          tenor: 24,
          fotoSerahTerimaId: foto?.id,
        },
        token: k,
      });
      expect(kode(akad)).toBe("PINJAMAN_BARU_DIKUNCI");

      const [w] = await baris<{ id: string }>(sql`
        insert into wilayah (kantor_id, nama, dibuat_oleh) values (${kantorId}, 'Pule', ${andiId})
        on conflict do nothing returning id`);
      const wilayahId =
        w?.id ??
        (
          await baris<{ id: string }>(
            sql`select id from wilayah where kantor_id = ${kantorId} limit 1`,
          )
        )[0]?.id;
      const [n] = await baris<{ id: string }>(sql`
        insert into nasabah (kantor_id, kolektor_id, nama, wilayah_id) values (${kantorId}, ${andiId}, 'Sari', ${wilayahId})
        returning id`);
      await rem(`nasabah/${n?.id}`, { naikPinjamanDikunci: true, gulungPinjamanDikunci: false });
      const aktif = (await kirim("/kebijakan/aktif", { token: b })).isi;
      expect(aktif.map((r: { lapis: string }) => r.lapis).sort()).toEqual([
        "kantor",
        "kolektor",
        "nasabah",
      ]);
      expect(aktif.find((r: { lapis: string }) => r.lapis === "nasabah")).toMatchObject({
        sasaran: { nama: "Sari" },
        pinjamanBaruDikunci: false,
        naikPinjamanDikunci: true,
      });
      // Semua saklar mati → barisnya hilang.
      await rem("kantor", mati);
      expect((await kirim("/kebijakan/aktif", { token: b })).isi).toHaveLength(2);
      expect(await aksi("kebijakan")).toEqual(["atur_rem", "atur_rem", "atur_rem", "lepas_rem"]);

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

      // ---- tarif gaji ----------------------------------------------------------------------
      const berlaku = async () => (await kirim("/tarif-gaji/berlaku", { token: k })).isi;
      const tarif = (isi: Record<string, unknown>) =>
        kirim("/tarif-gaji", { metode: "PUT", isi, token: b });
      expect(await berlaku()).toEqual({ tarifBp: 500, sumber: "kantor" });
      await tarif({ kolektorId: andiId, tarifBp: 600 });
      expect(await berlaku()).toEqual({ tarifBp: 600, sumber: "kolektor" });
      expect(kode(await tarif({ tarifBp: null }))).toBe("TARIF_KANTOR_WAJIB_PERSEN");
      expect(kode(await tarif({ tarifBp: 550, berlakuMulai: geserTanggal(hari, -1) }))).toBe(
        "TIDAK_BOLEH_MUNDUR",
      );
      // Tarif kantor hari ini ditimpa (baris registrasi); Andi tetap 6%.
      await tarif({ tarifBp: 550 });
      expect(await berlaku()).toEqual({ tarifBp: 600, sumber: "kolektor" });
      // Andi kembali ikut kantor.
      await tarif({ kolektorId: andiId, tarifBp: null });
      expect(await berlaku()).toEqual({ tarifBp: 550, sumber: "kantor" });
      expect((await kirim("/tarif-gaji", { token: b })).isi).toHaveLength(2);
      expect(await aksi("tarif_gaji")).toEqual(["timpa_tarif_gaji", "timpa_tarif_gaji"]);
    });
  }, 60_000);
});
