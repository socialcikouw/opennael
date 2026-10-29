import { describe, expect, test } from "bun:test";
import { sql } from "drizzle-orm";
import { dalamTransaksi, siapkanKantor, URL_DB } from "../../../uji/bantu";

/**
 * Gaji kolektor ujung ke ujung, di SATU transaksi yang dibatalkan. Periode
 * 1–15 Okt 2026; tarif kantor 5%, Andi 6% mulai 10 Okt:
 *
 *   2 Okt   storting 4.000.000 × 5% = 200.000
 *   3 Okt   tekor lama (arsip) 8.000
 *  12 Okt   storting 5.000.000 × 6% = 300.000; kurang setor 50.000
 *  14 Okt   storting −200.000 × 6% = −12.000 (J5)
 *           kotor 488.000 − tekor 58.000 = bersih 430.000
 */
describe.skipIf(!URL_DB)("gaji kolektor", () => {
  test("pratinjau, bayar, kas keluar, tumpang tindih, tekor melebihi gaji, batal", async () => {
    await dalamTransaksi(async (tx) => {
      const { kirim, bos, kolektor: andi, kantorId } = await siapkanKantor(tx);
      const b = bos.tokenAkses;
      const andiId = andi.pengguna.id;
      const bosId = bos.pengguna.id;
      const kode = (r: { isi: Record<string, unknown> }) => r.isi.kode;

      // Data lampau (jalan pintas migrasi): tarif bertanggal, hari kolektor, setoran.
      await tx.execute(sql`select set_config('nael.migrasi_data', 'ya', true)`);
      await tx.execute(sql`
        insert into tarif_gaji (kantor_id, kolektor_id, tarif_bp, berlaku_mulai, dibuat_oleh) values
          (${kantorId}, null, 500, '2026-01-01', ${bosId}),
          (${kantorId}, ${andiId}, 600, '2026-10-10', ${bosId})`);
      const [w] = (await tx.execute(sql`
        insert into wilayah (kantor_id, nama, dibuat_oleh) values (${kantorId}, 'Pule', ${andiId})
        returning id`)) as unknown as { id: string }[];
      const pinjamanLama = async (nama: string) => {
        const [n] = (await tx.execute(sql`
          insert into nasabah (kantor_id, kolektor_id, nama, wilayah_id)
          values (${kantorId}, ${andiId}, ${nama}, ${w?.id}) returning id`)) as unknown as {
          id: string;
        }[];
        const [p] = (await tx.execute(sql`
          insert into pinjaman (kantor_id, pencair_id, dibuat_oleh, nasabah_id, pinjaman_ke, jenis, tenor,
            asal, tanggal_akad, tanggal_disalin, pokok, potongan_admin, tabungan_masuk, pencairan,
            total_kembali, angsuran, saldo_awal, drop_baru, saldo)
          values (${kantorId}, ${andiId}, ${bosId}, ${n?.id}, 1, 'harian', 24, 'migrasi', '2026-09-01',
            '2026-09-01', 10000000, 0, 0, 0, 12000000, 500000, 12000000, 0, 12000000)
          returning id`)) as unknown as { id: string }[];
        return p?.id as string;
      };
      const p1 = await pinjamanLama("Budi");
      const p2 = await pinjamanLama("Sari");
      await tx.execute(sql`
        insert into transaksi (kantor_id, pencatat_id, pinjaman_id, tanggal, jenis,
          setoran_murni, setoran_pelunasan, tabungan_keluar, saldo_sesudah) values
          (${kantorId}, ${andiId}, ${p1}, '2026-10-02', 'angsuran', 4000000, 0, 0, 8000000),
          (${kantorId}, ${andiId}, ${p1}, '2026-10-12', 'angsuran', 5000000, 0, 0, 3000000),
          (${kantorId}, ${andiId}, ${p2}, '2026-10-14', 'pelunasan', 0, 300000, 500000, 0)`);
      const hari = async (tanggal: string, tekorLama: number | null = null) =>
        (
          (await tx.execute(sql`
            insert into hari_kolektor (kantor_id, kolektor_id, tanggal, absensi, kas_lapangan, laporan_dibuka_at, tekor_lama)
            values (${kantorId}, ${andiId}, ${tanggal}, 'masuk_kerja', 1000000, now(), ${tekorLama})
            returning id`)) as unknown as { id: string }[]
        )[0]?.id as string;
      await hari("2026-10-03", 8_000);
      const h12 = await hari("2026-10-12");
      const h18 = await hari("2026-10-18");
      await tx.execute(sql`
        insert into serah_terima_kas (kantor_id, hari_kolektor_id, tunai_seharusnya, tunai_diterima, diterima_oleh)
        values (${kantorId}, ${h12}, 1000000, 950000, ${bosId}),
               (${kantorId}, ${h18}, 1000000, 900000, ${bosId})`);
      await tx.execute(sql`select set_config('nael.migrasi_data', '', true)`);

      // ---- pratinjau --------------------------------------------------------------
      const pratinjau = (mulai: string, selesai: string) =>
        kirim(`/kas/gaji/pratinjau?kolektorId=${andiId}&mulai=${mulai}&selesai=${selesai}`, {
          token: b,
        });
      const pra = await pratinjau("2026-10-01", "2026-10-15");
      expect(pra.isi).toMatchObject({
        kolektor: { id: andiId, nama: "Andi" },
        gajiKotor: 488_000,
        potonganTekor: 58_000,
        gajiBersih: 430_000,
        halangan: null,
      });
      expect(pra.isi.hari).toEqual([
        { tanggal: "2026-10-02", storting: 4_000_000, tekor: 0, tarifBp: 500 },
        { tanggal: "2026-10-03", storting: 0, tekor: 8_000, tarifBp: 500 },
        { tanggal: "2026-10-12", storting: 5_000_000, tekor: 50_000, tarifBp: 600 },
        { tanggal: "2026-10-14", storting: -200_000, tekor: 0, tarifBp: 600 },
      ]);
      expect(
        kode(
          await kirim(
            `/kas/gaji/pratinjau?kolektorId=${andiId}&mulai=2026-10-01&selesai=2026-10-15`,
            { token: andi.tokenAkses },
          ),
        ),
      ).toBe("PERAN_DILARANG");

      // ---- bayar --------------------------------------------------------------------
      const bayar = (isi: Record<string, unknown>) =>
        kirim("/kas/gaji", {
          isi: { kolektorId: andiId, dariAkun: "tunai", ...isi },
          token: b,
        });
      expect(kode(await bayar({ periodeMulai: "2026-10-01", periodeSelesai: "2026-10-15" }))).toBe(
        "BUKU_KAS_BELUM_DIBUKA",
      );
      await kirim("/kas/buka", { isi: { tunai: 1_000_000, bank: 0 }, token: b });
      const slip = await bayar({ periodeMulai: "2026-10-01", periodeSelesai: "2026-10-15" });
      expect(slip.status).toBe(201);
      expect(slip.isi).toMatchObject({
        gajiKotor: 488_000,
        potonganTekor: 58_000,
        gajiBersih: 430_000,
      });

      // Kas keluar dari tunai di hari bayar.
      const lap = (await kirim("/kas/laporan", { token: b })).isi;
      expect(lap.tunai.saldoAkhir).toBe(570_000);
      expect(lap.gerakan).toContainEqual(
        expect.objectContaining({
          sumber: "pembayaran_gaji",
          akun: "tunai",
          nominal: -430_000,
          keterangan: "Andi",
        }),
      );

      // Tumpang tindih ditolak, pratinjau menandainya.
      expect(kode(await bayar({ periodeMulai: "2026-10-15", periodeSelesai: "2026-10-20" }))).toBe(
        "PERIODE_SUDAH_DIBAYAR",
      );
      expect((await pratinjau("2026-10-10", "2026-10-20")).isi.halangan).toBe(
        "PERIODE_SUDAH_DIBAYAR",
      );
      // Periode yang belum berakhir.
      expect((await pratinjau("2026-10-16", "2099-12-31")).isi.halangan).toBe(
        "PERIODE_BELUM_BERAKHIR",
      );
      expect(kode(await bayar({ periodeMulai: "2026-10-16", periodeSelesai: "2099-12-31" }))).toBe(
        "PERIODE_BELUM_BERAKHIR",
      );
      // 16–20 Okt: tanpa storting, kurang setor 100.000 → tekor melebihi gaji.
      expect((await pratinjau("2026-10-16", "2026-10-20")).isi.halangan).toBe(
        "TEKOR_MELEBIHI_GAJI",
      );
      expect(kode(await bayar({ periodeMulai: "2026-10-16", periodeSelesai: "2026-10-20" }))).toBe(
        "TEKOR_MELEBIHI_GAJI",
      );

      // ---- riwayat slip -------------------------------------------------------------
      expect((await kirim("/kas/gaji", { token: andi.tokenAkses })).isi).toHaveLength(1);
      expect(kode(await kirim(`/kas/gaji?kolektorId=${bosId}`, { token: andi.tokenAkses }))).toBe(
        "BUKAN_MILIK_ANDA",
      );

      // ---- batal, lalu bayar ulang lewat bank ---------------------------------------
      const batal = await kirim(`/kas/gaji/${slip.isi.id}/batal`, {
        isi: { alasan: "harusnya transfer" },
        token: b,
      });
      expect(batal.isi.alasanBatal).toBe("harusnya transfer");
      expect(
        kode(await kirim(`/kas/gaji/${slip.isi.id}/batal`, { isi: { alasan: "x" }, token: b })),
      ).toBe("SUDAH_DIBATALKAN");
      const ulang = await bayar({
        periodeMulai: "2026-10-01",
        periodeSelesai: "2026-10-15",
        dariAkun: "bank",
      });
      expect(ulang.status).toBe(201);
      const lap2 = (await kirim("/kas/laporan", { token: b })).isi;
      expect([lap2.tunai.saldoAkhir, lap2.bank.saldoAkhir]).toEqual([1_000_000, -430_000]);
      expect((await kirim("/kas/gaji", { token: b })).isi).toHaveLength(2);
    });
  }, 60_000);
});
