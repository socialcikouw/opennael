import { describe, expect, test } from "bun:test";
import type { Sesi } from "@opennael/contracts";
import { geserTanggal } from "@opennael/domain";
import { sql } from "drizzle-orm";
import { dalamTransaksi, siapkanKantor, URL_DB } from "../../uji/bantu";

/**
 * Koreksi bos atas hari kolektor & libur nasabah — skenario dokumen: nasabah
 * ditandai libur, kolektor sudah lapor, lalu nasabah datang membayar sore.
 * Semua di SATU transaksi yang dibatalkan.
 */
describe.skipIf(!URL_DB)("koreksi bos: hari kolektor & libur nasabah", () => {
  test("betulkan angka pagi, hapus libur, batal laporan, terkunci sesudah kas diterima", async () => {
    await dalamTransaksi(async (tx) => {
      const { kirim, bos, kolektor: andi, kantorId } = await siapkanKantor(tx);
      const b = bos.tokenAkses;
      const k = andi.tokenAkses;
      const andiId = andi.pengguna.id;
      const baris = async <T>(q: ReturnType<typeof sql>) => (await tx.execute(q)) as unknown as T[];
      const [hari] = await baris<{ t: string }>(
        sql`select kantor_hari_ini(${kantorId})::text as t`,
      );
      const T = hari?.t as string;

      const t = await kirim("/auth/tautan", { isi: {} });
      await kirim("/auth/tautan/setujui", {
        isi: { kode: t.isi.kode, akun: { peran: "kasir", nama: "Sari" } },
        token: b,
      });
      const ks = (
        (await kirim(`/auth/tautan/${t.isi.id}/klaim`, { isi: { klaim: t.isi.klaim } })).isi as Sesi
      ).tokenAkses;

      // Pegangan Andi: salinan migrasi, 4 angsuran sudah lunas (boleh libur, G3).
      const [w] = await baris<{ id: string }>(sql`
        insert into wilayah (kantor_id, nama, dibuat_oleh) values (${kantorId}, 'Pule', ${andiId}) returning id`);
      const pinjamanLama = async (nama: string) => {
        const [n] = await baris<{ id: string }>(sql`
          insert into nasabah (kantor_id, kolektor_id, nama, wilayah_id)
          values (${kantorId}, ${andiId}, ${nama}, ${w?.id}) returning id`);
        const [p] = await baris<{ id: string }>(sql`
          insert into pinjaman (kantor_id, pencair_id, dibuat_oleh, nasabah_id, pinjaman_ke, jenis, tenor,
            asal, tanggal_akad, tanggal_disalin, pokok, potongan_admin, tabungan_masuk, pencairan,
            total_kembali, angsuran, saldo_awal, drop_baru, saldo)
          values (${kantorId}, ${andiId}, ${bos.pengguna.id}, ${n?.id}, 1, 'harian', 24, 'migrasi',
            ${geserTanggal(T, -30)}, ${geserTanggal(T, -30)}, 2000000, 0, 0, 0, 2400000, 100000,
            2000000, 0, 2000000)
          returning id`);
        return p?.id as string;
      };
      const pTono = await pinjamanLama("Tono");
      const pBudi = await pinjamanLama("Budi");

      const ubah = (isi: Record<string, number>, token = b) =>
        kirim(`/hari-kolektor/${andiId}/hari-ini`, { metode: "PATCH", isi, token });
      const batalLaporan = (alasan = "Nasabah datang bayar sore") =>
        kirim(`/hari-kolektor/${andiId}/laporan/batal`, { isi: { alasan }, token: b });
      const jejak = (aksi: string) =>
        baris<{ sebelum: unknown; sesudah: unknown; alasan: string | null }>(sql`
          select sebelum, sesudah, alasan_perubahan as alasan from riwayat_perubahan
          where aksi = ${aksi} and kantor_id = ${kantorId}`);

      // ---- betulkan angka pagi ------------------------------------------------
      expect((await ubah({ kasLapangan: 1_200_000 })).isi.kode).toBe("BELUM_ABSEN");
      await kirim("/lapangan/absen", {
        isi: { absensi: "masuk_kerja", kasLapangan: 1_000_000, uangJalan: 50_000 },
        token: k,
      });
      expect((await ubah({ kasLapangan: 1_200_000 }, k)).status).toBe(403);
      expect((await ubah({})).status).toBe(400);
      expect((await ubah({ kasLapangan: 1_000_000 })).isi.kode).toBe("TIDAK_ADA_PERUBAHAN");
      const dibetulkan = await ubah({ kasLapangan: 1_200_000, uangJalan: 50_000 });
      expect(dibetulkan.status).toBe(200);
      expect(dibetulkan.isi).toMatchObject({ kasLapangan: 1_200_000, uangJalan: 50_000 });
      expect(await jejak("perbaiki_hari_kolektor")).toEqual([
        { sebelum: { kasLapangan: 1_000_000 }, sesudah: { kasLapangan: 1_200_000 }, alasan: null },
      ]);

      // ---- libur, lapor, nasabah datang sore ----------------------------------
      expect((await batalLaporan()).isi.kode).toBe("LAPORAN_BELUM_DIBUKA");
      const libur = await kirim("/lapangan/libur", { isi: { pinjamanId: pTono }, token: k });
      expect(libur.status).toBe(201);
      // C6: Budi juga wajib ditagih hari ini — laporan baru terbuka sesudah ia dicatat.
      expect((await kirim("/lapangan/laporan", { isi: {}, token: k })).isi.kode).toBe(
        "MASIH_ADA_TAGIHAN",
      );
      expect(
        (await kirim("/lapangan/libur", { isi: { pinjamanId: pBudi }, token: k })).status,
      ).toBe(201);
      expect((await kirim("/lapangan/laporan", { isi: {}, token: k })).status).toBe(200);
      const setorTono = () =>
        kirim("/lapangan/bayar", { isi: { pinjamanId: pTono, setoranMurni: 100_000 }, token: k });
      expect((await setorTono()).isi.kode).toBe("LAPORAN_SUDAH_DIBUKA");

      const hapus = (id: string, token = b) =>
        kirim(`/transaksi/libur/${id}/hapus`, { isi: { alasan: "Nasabah datang bayar" }, token });
      expect((await hapus(libur.isi.id, k)).status).toBe(403);
      const dihapus = await hapus(libur.isi.id);
      expect(dihapus.status).toBe(200);
      expect(dihapus.isi).toMatchObject({ id: libur.isi.id, pinjamanId: pTono, tanggal: T });
      expect(await jejak("hapus_libur")).toMatchObject([
        {
          sebelum: { id: libur.isi.id, pinjamanId: pTono, pencatatId: andiId },
          alasan: "Nasabah datang bayar",
        },
      ]);
      expect((await hapus(libur.isi.id)).status).toBe(404);

      const dibuka = await batalLaporan();
      expect(dibuka.status).toBe(200);
      expect(dibuka.isi.laporanDibukaAt).toBeNull();
      expect((await jejak("batal_laporan"))[0]?.alasan).toBe("Nasabah datang bayar sore");
      expect((await setorTono()).status).toBe(201);

      // Libur hari lain tidak bisa dihapus.
      const [kemarin] = await baris<{ id: string }>(sql`
        insert into libur_nasabah (kantor_id, pencatat_id, pinjaman_id, tanggal)
        values (${kantorId}, ${andiId}, ${pBudi}, ${geserTanggal(T, -1)}) returning id`);
      expect((await hapus(kemarin?.id as string)).isi.kode).toBe("BATAL_HANYA_HARI_INI");

      // ---- terkunci sesudah kas diterima --------------------------------------
      await kirim("/lapangan/laporan", { isi: {}, token: k });
      const terima = await kirim(`/hari-kolektor/${andiId}/terima-kas`, {
        isi: { tunaiDiterima: 1_250_000 },
        token: ks,
      });
      expect(terima.status).toBe(201);
      expect((await ubah({ uangJalan: 60_000 })).isi.kode).toBe("KAS_SUDAH_DITERIMA");
      expect((await batalLaporan()).isi.kode).toBe("KAS_SUDAH_DITERIMA");

      // Kolektor tidak kerja hari ini: angka pagi tak bisa dibetulkan.
      const [dedi] = await baris<{ id: string }>(sql`
        insert into pengguna (kantor_id, peran, nama) values (${kantorId}, 'kolektor', 'Dedi') returning id`);
      await tx.execute(sql`
        insert into hari_kolektor (kantor_id, kolektor_id, tanggal, absensi, alasan_tidak_kerja)
        values (${kantorId}, ${dedi?.id}, ${T}, 'tidak_kerja', 'Sakit')`);
      const dediUbah = await kirim(`/hari-kolektor/${dedi?.id}/hari-ini`, {
        metode: "PATCH",
        isi: { kasLapangan: 100_000 },
        token: b,
      });
      expect(dediUbah.isi.kode).toBe("TIDAK_KERJA_HARI_INI");
    });
  }, 60_000);
});
