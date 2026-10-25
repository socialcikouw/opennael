import { describe, expect, test } from "bun:test";
import type { Sesi } from "@opennael/contracts";
import { sql } from "drizzle-orm";
import { dalamTransaksi, siapkanKantor, URL_DB } from "../../uji/bantu";

/**
 * Kas kantor & tabungan nasabah ujung ke ujung, di SATU transaksi yang
 * dibatalkan. Angka dihitung tangan di komentar — rumus saldo akun:
 * docs/skema/schema-buku-kas.md.
 */
describe.skipIf(!URL_DB)("kas kantor & tabungan", () => {
  test("buku kas, mutasi, laporan, pencocokan hitung buta, penarikan & koreksi tabungan", async () => {
    await dalamTransaksi(async (tx) => {
      const { kirim, bos, kolektor: andi, kantorId } = await siapkanKantor(tx);
      const b = bos.tokenAkses;
      const k = andi.tokenAkses;
      const andiId = andi.pengguna.id;
      const tautkan = async (peran: "kasir" | "pengawas", nama: string) => {
        const t = await kirim("/auth/tautan", { isi: {} });
        await kirim("/auth/tautan/setujui", {
          isi: { kode: t.isi.kode, akun: { peran, nama } },
          token: b,
        });
        return (
          (await kirim(`/auth/tautan/${t.isi.id}/klaim`, { isi: { klaim: t.isi.klaim } }))
            .isi as Sesi
        ).tokenAkses;
      };
      const ks = await tautkan("kasir", "Sari");
      const pw = await tautkan("pengawas", "Pak Wawan");
      const kode = (r: { isi: Record<string, unknown> }) => r.isi.kode;
      const laporan = async () => (await kirim("/kas/laporan", { token: b })).isi;

      // ---- buku kas ---------------------------------------------------------------
      const mutasi = (isi: Record<string, unknown>, token = b) =>
        kirim("/kas/mutasi", { isi, token });
      const modal = {
        jenis: "setor_modal",
        keAkun: "tunai",
        nominal: 1_000_000,
        keterangan: "modal",
      };
      expect(kode(await mutasi(modal))).toBe("BUKU_KAS_BELUM_DIBUKA");
      expect((await laporan()).bukuKas).toBeNull();
      expect(kode(await kirim("/kas/buka", { isi: { tunai: 1, bank: 0 }, token: pw }))).toBe(
        "PERAN_DILARANG",
      );
      const buka = await kirim("/kas/buka", {
        isi: { tunai: 5_000_000, bank: 2_000_000 },
        token: b,
      });
      expect(buka.status).toBe(200);
      expect(kode(await kirim("/kas/buka", { isi: { tunai: 1, bank: 1 }, token: b }))).toBe(
        "BUKU_KAS_SUDAH_DIBUKA",
      );
      // Salah ketik di hari pembukaan boleh dibetulkan — tercatat di riwayat.
      const ubah = await kirim("/kas/buka", {
        metode: "PATCH",
        isi: { tunai: 5_500_000 },
        token: b,
      });
      expect(ubah.isi).toMatchObject({ kasAwalTunai: 5_500_000, kasAwalBank: 2_000_000 });
      const jejak = (await tx.execute(sql`
        select aksi, sebelum, sesudah from riwayat_perubahan
        where kantor_id = ${kantorId} and tabel = 'buku_kas'`)) as unknown as Record<
        string,
        unknown
      >[];
      expect(jejak).toEqual([
        {
          aksi: "ubah_kas_awal",
          sebelum: { kasAwalTunai: 5_000_000, kasAwalBank: 2_000_000 },
          sesudah: { kasAwalTunai: 5_500_000, kasAwalBank: 2_000_000 },
        },
      ]);

      // ---- mutasi -----------------------------------------------------------------
      expect((await mutasi(modal)).status).toBe(200);
      const pindah = await mutasi({
        jenis: "pindah_akun",
        dariAkun: "tunai",
        keAkun: "bank",
        nominal: 500_000,
        keterangan: "setor ke BRI",
      });
      await mutasi({
        jenis: "biaya_kantor",
        dariAkun: "bank",
        nominal: 100_000,
        keterangan: "listrik",
      });
      expect(kode(await mutasi({ ...modal, dariAkun: "bank" }))).toBe("AKUN_MUTASI_TIDAK_SESUAI");
      expect(kode(await mutasi(modal, pw))).toBe("PERAN_DILARANG");
      const salah = await mutasi({ ...modal, nominal: 9_999 });
      const batalSalah = await kirim(`/kas/mutasi/${salah.isi.id}/batal`, {
        isi: { alasan: "salah ketik" },
        token: b,
      });
      expect(batalSalah.isi.alasanBatal).toBe("salah ketik");
      expect(
        kode(await kirim(`/kas/mutasi/${salah.isi.id}/batal`, { isi: { alasan: "x" }, token: b })),
      ).toBe("SUDAH_DIBATALKAN");

      // ---- hari kolektor: kas 1 jt + uang jalan 50 rb, setoran 200 rb (50 rb transfer) ---
      const [w] = (await tx.execute(sql`
        insert into wilayah (kantor_id, nama, dibuat_oleh) values (${kantorId}, 'Pule', ${andiId})
        returning id`)) as unknown as { id: string }[];
      const [n] = (await tx.execute(sql`
        insert into nasabah (kantor_id, kolektor_id, nama, wilayah_id, saldo_tabungan)
        values (${kantorId}, ${andiId}, 'Lasminati', ${w?.id}, 600000) returning id`)) as unknown as {
        id: string;
      }[];
      const [p] = (await tx.execute(sql`
        insert into pinjaman (kantor_id, pencair_id, dibuat_oleh, nasabah_id, pinjaman_ke, jenis, tenor,
          asal, tanggal_akad, tanggal_disalin, pokok, potongan_admin, tabungan_masuk, pencairan,
          total_kembali, angsuran, saldo_awal, drop_baru, saldo)
        values (${kantorId}, ${andiId}, ${bos.pengguna.id}, ${n?.id}, 1, 'harian', 24, 'migrasi',
          '2026-09-01', '2026-10-01', 1000000, 0, 600000, 0, 1200000, 50000, 1000000, 0, 1000000)
        returning id`)) as unknown as { id: string }[];
      await kirim("/lapangan/absen", {
        isi: { absensi: "masuk_kerja", kasLapangan: 1_000_000, uangJalan: 50_000 },
        token: k,
      });
      const setor = await kirim("/lapangan/bayar", {
        isi: { pinjamanId: p?.id, setoranMurni: 200_000 },
        token: k,
      });
      await kirim("/transfer-setoran", {
        isi: { transaksiId: setor.isi.id, nominal: 50_000 },
        token: ks,
      });

      // tunai = 5.500.000 + 1.000.000 − 500.000 = 6.000.000; di lapangan 1.050.000.
      // bank  = 2.000.000 + 500.000 − 100.000 + 50.000 (transfer) = 2.450.000.
      const lap1 = await laporan();
      expect(lap1.tunai).toEqual({
        saldoAwal: 5_500_000,
        masuk: 1_000_000,
        keluar: 500_000,
        saldoAkhir: 6_000_000,
      });
      expect(lap1.bank.saldoAkhir).toBe(2_450_000);
      expect(lap1.kasDiLapangan).toBe(1_050_000);
      expect(lap1.brankasSeharusnya).toBe(4_950_000);
      expect(
        lap1.gerakan.map((g: { sumber: string; akun: string; nominal: number }) => [
          g.sumber,
          g.akun,
          g.nominal,
        ]),
      ).toEqual(
        expect.arrayContaining([
          ["mutasi", "tunai", 1_000_000],
          ["mutasi", "tunai", -500_000],
          ["mutasi", "bank", 500_000],
          ["mutasi", "bank", -100_000],
          ["transfer_setoran", "bank", 50_000],
        ]),
      );

      // ---- pencocokan hitung buta --------------------------------------------------
      expect(kode(await kirim("/kas/laporan", { token: pw }))).toBe("PERAN_DILARANG");
      const cocok = (isi: Record<string, unknown>, token: string) =>
        kirim("/kas/pencocokan", { isi, token });
      expect(kode(await cocok({ akun: "tunai", saldoNyata: 4_900_000 }, ks))).toBe(
        "PERAN_DILARANG",
      );
      expect(kode(await cocok({ akun: "tunai", saldoNyata: 4_900_000 }, pw))).toBe(
        "KETERANGAN_SELISIH_WAJIB",
      );
      const hasilPw = await cocok(
        { akun: "tunai", saldoNyata: 4_900_000, keterangan: "kembalian belum dicatat" },
        pw,
      );
      expect(hasilPw.isi).toMatchObject({
        saldoBuku: 4_950_000,
        saldoNyata: 4_900_000,
        selisih: -50_000,
        dicocokkanOleh: { nama: "Pak Wawan" },
      });
      // Bank cocok persis → keterangan tak perlu.
      const hasilBos = await cocok({ akun: "bank", saldoNyata: 2_450_000 }, b);
      expect(hasilBos.isi.selisih).toBe(0);
      expect((await kirim("/kas/pencocokan", { token: pw })).isi).toHaveLength(1);
      expect((await kirim("/kas/pencocokan", { token: b })).isi).toHaveLength(2);

      // ---- serah terima: tunai masuk 1.150.000 − 1.000.000 − 50.000 = 100.000 ------------
      await kirim("/lapangan/laporan", { isi: {}, token: k });
      const terima = await kirim(`/hari-kolektor/${andiId}/terima-kas`, {
        isi: { tunaiDiterima: 1_150_000 },
        token: ks,
      });
      expect(terima.isi.serahTerima.selisihSetor).toBe(0);
      const lap2 = await laporan();
      expect(lap2.kasDiLapangan).toBe(0);
      expect(lap2.tunai.saldoAkhir).toBe(6_100_000);
      expect(lap2.brankasSeharusnya).toBe(6_100_000);

      // ---- penarikan tabungan (contoh Lasminati: 600.000, ditarik 300.000) --------------
      const tarik = (isi: Record<string, unknown>, token = b) =>
        kirim(`/nasabah/${n?.id}/penarikan-tabungan`, { isi, token });
      const isiTarik = {
        nominal: 300_000,
        dariAkun: "tunai",
        saldoSebelum: 600_000,
        alasan: "gulung",
      };
      expect(kode(await tarik(isiTarik, pw))).toBe("PERAN_DILARANG");
      expect(kode(await tarik({ ...isiTarik, nominal: 600_001 }))).toBe("TABUNGAN_TIDAK_CUKUP");
      const ditarik = await tarik(isiTarik);
      expect(ditarik.status).toBe(201);
      expect(kode(await tarik(isiTarik))).toBe("TABUNGAN_BERUBAH");
      const saldoTabungan = async () =>
        (
          (await tx.execute(sql`
            select saldo_tabungan::int as s from nasabah where id = ${n?.id}`)) as unknown as {
            s: number;
          }[]
        )[0]?.s;
      expect(await saldoTabungan()).toBe(300_000);
      expect((await laporan()).tunai.saldoAkhir).toBe(5_800_000);
      const batalTarik = await kirim(`/penarikan-tabungan/${ditarik.isi.id}/batal`, {
        isi: { alasan: "nasabah batal mengambil" },
        token: b,
      });
      expect(batalTarik.isi.alasanBatal).toBe("nasabah batal mengambil");
      expect(await saldoTabungan()).toBe(600_000);
      expect((await laporan()).tunai.saldoAkhir).toBe(6_100_000);
      expect((await kirim(`/nasabah/${n?.id}/penarikan-tabungan`, { token: pw })).isi).toHaveLength(
        1,
      );

      // ---- koreksi tabungan (tanpa uang; ≤ 5 × pokok 1 jt) -------------------------------
      const koreksi = (isi: Record<string, unknown>) =>
        kirim(`/nasabah/${n?.id}/koreksi-tabungan`, { isi, token: b });
      const dikoreksi = await koreksi({
        saldoBaru: 550_000,
        saldoSebelum: 600_000,
        alasan: "salah salin",
      });
      expect(dikoreksi.isi).toMatchObject({
        saldoSebelum: 600_000,
        selisih: -50_000,
        saldoSesudah: 550_000,
      });
      expect(await saldoTabungan()).toBe(550_000);
      expect(
        kode(await koreksi({ saldoBaru: 5_000_001, saldoSebelum: 550_000, alasan: "x" })),
      ).toBe("TABUNGAN_TIDAK_WAJAR");
      expect(kode(await koreksi({ saldoBaru: 550_000, saldoSebelum: 550_000, alasan: "x" }))).toBe(
        "TIDAK_ADA_PERUBAHAN",
      );
      // Koreksi tidak menyentuh buku kas.
      expect((await laporan()).tunai.saldoAkhir).toBe(6_100_000);
      const riwayatKoreksi = await kirim(`/nasabah/${n?.id}/koreksi-tabungan`, { token: pw });
      expect(riwayatKoreksi.isi).toHaveLength(1);

      // Batal pindah akun mengembalikan kedua akun.
      await kirim(`/kas/mutasi/${pindah.isi.id}/batal`, {
        isi: { alasan: "batal setor" },
        token: b,
      });
      const lap3 = await laporan();
      expect([lap3.tunai.saldoAkhir, lap3.bank.saldoAkhir]).toEqual([6_600_000, 1_950_000]);
    });
  }, 60_000);
});
