import { describe, expect, test } from "bun:test";
import { sql } from "drizzle-orm";
import { dalamTransaksi, URL_DB } from "../../../uji/bantu";
import { kode, siapkanLapangan } from "../../../uji/lapangan";

/** Akad & gulung kolektor, ujung ke ujung. Angka mengikuti docs/aturan-usaha.md. */
describe.skipIf(!URL_DB)("akad", () => {
  test("akad: syarat, NIK, foto serah terima, pinjaman aktif, tabungan masuk", async () => {
    await dalamTransaksi(async (tx) => {
      const { kirim, bos, andi, k, absen, fotoBaru, akadBaru } = await siapkanLapangan(tx);
      await absen();

      // ---- akad (A) ------------------------------------------------------------
      const sari = await akadBaru("Sari", {
        nasabah: { nama: "Sari", kampung: { nama: " Pule  Barat " }, nik: "3201010101010001" },
      });
      expect(sari.status).toBe(201);
      expect(sari.isi).toMatchObject({
        pinjamanKe: 1,
        pokok: 1_000_000,
        potonganAdmin: 50_000,
        tabunganMasuk: 50_000,
        pencairan: 900_000,
        saldo: 1_200_000,
        angsuran: 50_000,
        angsuranKe: 0,
        nasabah: { nama: "Sari", kampung: "Pule Barat" },
      });
      expect(
        kode(
          await akadBaru("Sari Lain", {
            nasabah: {
              nama: "Sari Lain",
              kampung: { nama: "Pule Barat" },
              nik: "3201010101010001",
            },
          }),
        ),
      ).toBe("NIK_SUDAH_TERDAFTAR");
      expect(
        kode(
          await akadBaru("X", {
            fotoSerahTerimaId: sari.isi.fotoSerahTerimaId ?? (await fotoBaru()),
            pokok: 150_000,
          }),
        ),
      ).toBe("POKOK_TIDAK_SAH");
      expect(
        kode(await akadBaru("X", { fotoSerahTerimaId: await fotoBaru(bos.pengguna.id) })),
      ).toBe("FOTO_BUKAN_MILIK_ANDA");
      expect(
        kode(await akadBaru("X", { fotoSerahTerimaId: await fotoBaru(andi.pengguna.id, 90) })),
      ).toBe("FOTO_KEDALUWARSA");
      // Nasabah lama yang masih berpinjaman tak bisa akad lagi.
      expect(
        kode(
          await kirim(
            "/lapangan/akad",
            {
              nasabah: { nasabahId: sari.isi.nasabah.id },
              jenis: "harian",
              pokok: 1_000_000,
              tenor: 24,
              fotoSerahTerimaId: await fotoBaru(),
            },
            k,
          ),
        ),
      ).toBe("PINJAMAN_MASIH_AKTIF");
      const [tab] = (await tx.execute(
        sql`select saldo_tabungan from nasabah where id = ${sari.isi.nasabah.id}`,
      )) as unknown as { saldo_tabungan: string }[];
      expect(Number(tab?.saldo_tabungan)).toBe(50_000);
    });
  }, 120_000);

  test("gulung: kunci rem, pinjaman pertama tak boleh naik, pelunasan + pinjaman penerus", async () => {
    await dalamTransaksi(async (tx) => {
      const { kirim, bos, k, kantorId, absen, fotoBaru, akadBaru } = await siapkanLapangan(tx);
      await absen();
      const tono = await akadBaru("Tono");
      // Seolah 12 angsuran sudah terbayar: saldo 600.000.
      await tx.execute(sql`update pinjaman set saldo = 600000 where id = ${tono.isi.id}`);
      const gulung = (pokok: number, foto?: string) =>
        (async () =>
          kirim(
            "/lapangan/gulung",
            { pinjamanId: tono.isi.id, pokok, tenor: 24, fotoSerahTerimaId: foto ?? "" },
            k,
          ))();
      await tx.execute(sql`insert into kebijakan (kantor_id, gulung_pinjaman_dikunci, alasan_kunci, diubah_oleh)
                           values (${kantorId}, true, 'Akhir bulan', ${bos.pengguna.id})`);
      const dikunci = await gulung(1_000_000, await fotoBaru());
      expect(kode(dikunci)).toBe("GULUNG_PINJAMAN_DIKUNCI");
      expect(dikunci.isi.pesan).toContain("Akhir bulan");
      await tx.execute(sql`delete from kebijakan where kantor_id = ${kantorId}`);
      expect(kode(await gulung(1_500_000, await fotoBaru()))).toBe(
        "GULUNG_PERTAMA_TIDAK_BOLEH_NAIK",
      );
      const g = await gulung(1_000_000, await fotoBaru());
      expect(g.status).toBe(201);
      expect(g.isi.transaksi).toMatchObject({
        jenis: "gulung",
        setoranMurni: 0,
        setoranPelunasan: 600_000,
        saldoSesudah: 0,
      });
      expect(g.isi.pinjamanBaru).toMatchObject({
        asal: "gulung",
        pinjamanKe: 2,
        pencairan: 300_000,
        saldo: 1_200_000,
      });
    });
  }, 120_000);

  test("rem bos: pinjaman baru dikunci untuk kolektor", async () => {
    await dalamTransaksi(async (tx) => {
      const { bos, andi, kantorId, absen, akadBaru } = await siapkanLapangan(tx);
      await absen();
      await tx.execute(sql`insert into kebijakan (kantor_id, kolektor_id, pinjaman_baru_dikunci, diubah_oleh)
                           values (${kantorId}, ${andi.pengguna.id}, true, ${bos.pengguna.id})`);
      expect(kode(await akadBaru("Dewi"))).toBe("PINJAMAN_BARU_DIKUNCI");
    });
  }, 120_000);
});
