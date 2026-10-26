import { describe, expect, test } from "bun:test";
import type { Sesi } from "@opennael/contracts";
import { sql } from "drizzle-orm";
import { dalamTransaksi, siapkanKantor, URL_DB } from "../../uji/bantu";

/**
 * Pembatalan bos ujung ke ujung: operasi lapangan sungguhan hari ini, lalu
 * dibatalkan — semua di SATU transaksi yang dibatalkan.
 */
describe.skipIf(!URL_DB)("pembatalan bos", () => {
  test("batal angsuran, pelunasan, gulung, akad — dan kuncinya", async () => {
    await dalamTransaksi(async (tx) => {
      const { kirim, bos, kolektor: andi, kantorId } = await siapkanKantor(tx);
      const b = bos.tokenAkses;
      const k = andi.tokenAkses;
      const andiId = andi.pengguna.id;
      const kode = (r: { isi: Record<string, unknown> }) => r.isi.kode;
      const baris = async <T>(q: ReturnType<typeof sql>) => (await tx.execute(q)) as unknown as T[];

      const t = await kirim("/auth/tautan", { isi: {} });
      await kirim("/auth/tautan/setujui", {
        isi: { kode: t.isi.kode, akun: { peran: "kasir", nama: "Sari" } },
        token: b,
      });
      const ks = (
        (await kirim(`/auth/tautan/${t.isi.id}/klaim`, { isi: { klaim: t.isi.klaim } })).isi as Sesi
      ).tokenAkses;

      // Pegangan Andi (salinan migrasi).
      const [w] = await baris<{ id: string }>(sql`
        insert into wilayah (kantor_id, nama, dibuat_oleh) values (${kantorId}, 'Pule', ${andiId})
        returning id`);
      const pinjamanLama = async (isi: {
        nama: string;
        tabungan?: number;
        jenis?: string;
        tenor?: number;
        angsuran?: number;
        saldo: number;
        status?: string;
        tanggalMacet?: string;
      }) => {
        const [n] = await baris<{ id: string }>(sql`
          insert into nasabah (kantor_id, kolektor_id, nama, wilayah_id, saldo_tabungan)
          values (${kantorId}, ${andiId}, ${isi.nama}, ${w?.id}, ${isi.tabungan ?? 0}) returning id`);
        const [p] = await baris<{ id: string }>(sql`
          insert into pinjaman (kantor_id, pencair_id, dibuat_oleh, nasabah_id, pinjaman_ke, jenis, tenor,
            asal, tanggal_akad, tanggal_disalin, pokok, potongan_admin, tabungan_masuk, pencairan,
            total_kembali, angsuran, saldo_awal, drop_baru, saldo, status, tanggal_macet)
          values (${kantorId}, ${andiId}, ${bos.pengguna.id}, ${n?.id}, 1, ${isi.jenis ?? "harian"},
            ${isi.tenor ?? 24}, 'migrasi', '2026-08-01', '2026-09-01', 1000000, 0, ${isi.tabungan ?? 0}, 0,
            1200000, ${isi.angsuran ?? 50_000}, ${isi.saldo}, 0, ${isi.saldo}, ${isi.status ?? "berjalan"},
            ${isi.tanggalMacet ?? null})
          returning id`);
        return { pinjamanId: p?.id as string, nasabahId: n?.id as string };
      };
      const a = await pinjamanLama({ nama: "A", saldo: 1_200_000 });
      const bLunas = await pinjamanLama({
        nama: "B",
        saldo: 600_000,
        tabungan: 300_000,
        status: "macet",
        tanggalMacet: "2026-10-01",
      });
      const c = await pinjamanLama({
        nama: "C",
        jenis: "mingguan",
        tenor: 10,
        angsuran: 120_000,
        saldo: 600_000,
      });
      const f = await pinjamanLama({ nama: "F", saldo: 1_200_000 });

      let nomorFoto = 0;
      const fotoBaru = async () =>
        (
          await baris<{ id: string }>(sql`
            insert into foto (kantor_id, jenis, kunci_berkas, sha256, ukuran_byte, tipe_mime, diunggah_oleh)
            values (${kantorId}, 'serah_terima', 'f', ${String(++nomorFoto).padStart(64, "b")}, 1000,
                    'image/webp', ${andiId}) returning id`)
        )[0]?.id as string;
      const akadBaru = async (nama: string) =>
        kirim("/lapangan/akad", {
          isi: {
            nasabah: { nama, kampung: { nama: "Pule" } },
            jenis: "harian",
            pokok: 1_000_000,
            tenor: 24,
            fotoSerahTerimaId: await fotoBaru(),
          },
          token: k,
        });
      const gulungC = async () =>
        kirim("/lapangan/gulung", {
          isi: {
            pinjamanId: c.pinjamanId,
            pokok: 1_000_000,
            tenor: 10,
            fotoSerahTerimaId: await fotoBaru(),
          },
          token: k,
        });
      const status = async (pinjamanId: string) =>
        (
          await baris<{ status: string; saldo: number; tanggal_macet: string | null }>(sql`
            select status, saldo::int, tanggal_macet::text from pinjaman where id = ${pinjamanId}`)
        )[0];
      const tabungan = async (nasabahId: string) =>
        (
          await baris<{ s: number }>(
            sql`select saldo_tabungan::int as s from nasabah where id = ${nasabahId}`,
          )
        )[0]?.s;

      // ---- lapangan hari ini -----------------------------------------------------
      await kirim("/lapangan/absen", {
        isi: { absensi: "masuk_kerja", kasLapangan: 2_000_000, uangJalan: 0 },
        token: k,
      });
      const setorA = await kirim("/lapangan/bayar", {
        isi: { pinjamanId: a.pinjamanId, setoranMurni: 50_000 },
        token: k,
      });
      await kirim("/transfer-setoran", {
        isi: { transaksiId: setorA.isi.id, nominal: 50_000 },
        token: ks,
      });
      const lunasB = await kirim("/lapangan/lunas", {
        isi: { pinjamanId: bLunas.pinjamanId },
        token: k,
      });
      expect(lunasB.status).toBe(201);
      const gulung = await gulungC();
      expect(gulung.status).toBe(201);
      const tabunganC = await tabungan(c.nasabahId);
      const akadD = await akadBaru("D");
      const akadE = await akadBaru("E");
      const setorF = await kirim("/lapangan/bayar", {
        isi: { pinjamanId: f.pinjamanId, setoranMurni: 50_000 },
        token: k,
      });

      const batal = (jalur: string, alasan = "salah input", token = b) =>
        kirim(jalur, { isi: { alasan }, token });

      // ---- batal angsuran: saldo kembali, transfer ikut batal -------------------------
      expect(kode(await batal(`/transaksi/${setorA.isi.id}/batal`, "x", ks))).toBe(
        "PERAN_DILARANG",
      );
      const bA = await batal(`/transaksi/${setorA.isi.id}/batal`);
      expect(bA.isi).toMatchObject({
        jenis: "angsuran",
        pinjaman: { status: "berjalan", saldo: 1_200_000 },
        transferDibatalkan: 1,
      });
      expect((await kirim(`/transfer-setoran?kolektorId=${andiId}`, { token: ks })).isi.total).toBe(
        0,
      );
      expect(kode(await batal(`/transaksi/${setorA.isi.id}/batal`))).toBe("SUDAH_DIBATALKAN");

      // ---- batal pelunasan: kembali macet dengan tanggal aslinya, tabungan kembali -----
      expect(await tabungan(bLunas.nasabahId)).toBe(0);
      const bB = await batal(`/transaksi/${lunasB.isi.id}/batal`);
      expect(bB.isi.pinjaman).toMatchObject({ status: "macet", saldo: 600_000 });
      expect(await status(bLunas.pinjamanId)).toMatchObject({ tanggal_macet: "2026-10-01" });
      expect(await tabungan(bLunas.nasabahId)).toBe(300_000);

      // ---- batal gulung: penerus batal, tabungannya ditarik, asal dibuka lagi -----------
      const bC = await batal(`/transaksi/${gulung.isi.transaksi.id}/batal`);
      expect(bC.isi).toMatchObject({
        jenis: "gulung",
        pinjaman: { status: "berjalan", saldo: 600_000 },
        penerusDibatalkanId: gulung.isi.pinjamanBaru.id,
      });
      expect((await status(gulung.isi.pinjamanBaru.id))?.status).toBe("batal");
      expect(await tabungan(c.nasabahId)).toBe(
        (tabunganC ?? 0) - gulung.isi.pinjamanBaru.tabunganMasuk,
      );
      // Akad penerus gulung hanya lewat batal gulungnya.
      const gulung2 = await gulungC();
      expect(gulung2.status).toBe(201);
      expect(kode(await batal(`/pinjaman/${gulung2.isi.pinjamanBaru.id}/batal`))).toBe(
        "BATAL_LEWAT_GULUNG",
      );

      // ---- batal akad: status batal, tabungan masuk ditarik ------------------------------
      const bD = await batal(`/pinjaman/${akadD.isi.id}/batal`);
      expect(bD.isi).toMatchObject({ status: "batal", tabunganDitarik: 50_000 });
      expect(await tabungan(akadD.isi.nasabah.id)).toBe(0);
      expect(kode(await batal(`/pinjaman/${akadD.isi.id}/batal`))).toBe("SUDAH_DIBATALKAN");
      // Salinan lama: bukan hari akadnya.
      expect(kode(await batal(`/pinjaman/${a.pinjamanId}/batal`))).toBe("BATAL_HANYA_HARI_INI");

      // ---- sesudah kas diterima: hari terkunci ----------------------------------------
      // Laporan dibuka langsung: pinjaman uji di atas sengaja dibiarkan tanpa
      // catatan hari ini (setoran dibatalkan, belum boleh libur), sedangkan
      // gerbang laporan C6 diuji di koreksi-bos & lapangan.
      await tx.execute(
        sql`update hari_kolektor set laporan_dibuka_at = now() where kolektor_id = ${andiId}`,
      );
      const terima = await kirim(`/hari-kolektor/${andiId}/terima-kas`, {
        isi: { tunaiDiterima: 0 },
        token: ks,
      });
      expect(terima.status).toBe(201);
      expect(kode(await batal(`/transaksi/${setorF.isi.id}/batal`))).toBe("KAS_SUDAH_DITERIMA");
      expect(kode(await batal(`/pinjaman/${akadE.isi.id}/batal`))).toBe("KAS_SUDAH_DITERIMA");
    });
  }, 60_000);
});
