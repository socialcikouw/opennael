import { describe, expect, test } from "bun:test";
import { sql } from "drizzle-orm";
import { dalamTransaksi, siapkanKantor, URL_DB } from "../../../uji/bantu";

/** Pemutihan, batal pemutihan, dan blokir nasabah — di SATU transaksi yang dibatalkan. */
describe.skipIf(!URL_DB)("pemutihan", () => {
  test("putihkan & blokir, batal kembali macet, pemutihan terakhir membuka blokir", async () => {
    await dalamTransaksi(async (tx) => {
      const { kirim, bos, kolektor: andi, kantorId } = await siapkanKantor(tx);
      const b = bos.tokenAkses;
      const k = andi.tokenAkses;
      const andiId = andi.pengguna.id;
      const kode = (r: { isi: Record<string, unknown> }) => r.isi.kode;
      const baris = async <T>(q: ReturnType<typeof sql>) => (await tx.execute(q)) as unknown as T[];

      const [w] = await baris<{ id: string }>(sql`
        insert into wilayah (kantor_id, nama, dibuat_oleh) values (${kantorId}, 'Pule', ${andiId})
        returning id`);
      const nasabahBaru = async (nama: string) =>
        (
          await baris<{ id: string }>(sql`
            insert into nasabah (kantor_id, kolektor_id, nama, wilayah_id, saldo_tabungan)
            values (${kantorId}, ${andiId}, ${nama}, ${w?.id}, 100000) returning id`)
        )[0]?.id as string;
      const pinjamanLama = async (nasabahId: string, ke: number, tanggalMacet: string | null) =>
        (
          await baris<{ id: string }>(sql`
            insert into pinjaman (kantor_id, pencair_id, dibuat_oleh, nasabah_id, pinjaman_ke, jenis, tenor,
              asal, tanggal_akad, tanggal_disalin, pokok, potongan_admin, tabungan_masuk, pencairan,
              total_kembali, angsuran, saldo_awal, drop_baru, saldo, status, tanggal_macet)
            values (${kantorId}, ${andiId}, ${bos.pengguna.id}, ${nasabahId}, ${ke}, 'harian', 24, 'migrasi',
              '2026-08-01', '2026-09-01', 1000000, 0, 0, 0, 1200000, 50000, 800000, 0, 800000,
              ${tanggalMacet ? "macet" : "berjalan"}, ${tanggalMacet})
            returning id`)
        )[0]?.id as string;
      const keadaan = async (pinjamanId: string) =>
        (
          await baris<{
            status: string;
            saldo: number;
            tanggal_macet: string | null;
            diblokir: boolean;
          }>(sql`
            select p.status, p.saldo::int, p.tanggal_macet::text, n.diblokir_at is not null as diblokir
            from pinjaman p join nasabah n on n.id = p.nasabah_id where p.id = ${pinjamanId}`)
        )[0];
      const jejak = async (barisId: string) =>
        (
          await baris<{ aksi: string }>(sql`
            select aksi from riwayat_perubahan where baris_id = ${barisId} order by dibuat_at`)
        ).map((r) => r.aksi);
      const putihkan = (id: string, token = b) =>
        kirim(`/pinjaman/${id}/putihkan`, {
          isi: { alasan: "macet_lama", keterangan: "tak tertagih 6 bulan" },
          token,
        });
      const batal = (id: string) =>
        kirim(`/pinjaman/${id}/putihkan/batal`, { isi: { alasan: "salah pinjaman" }, token: b });

      // ---- satu pemutihan: diblokir, lalu batal → kembali macet & blokir dibuka ---------
      const nSari = await nasabahBaru("Sari");
      const pSari = await pinjamanLama(nSari, 1, "2026-10-01");
      expect(kode(await putihkan(pSari, k))).toBe("PERAN_DILARANG");
      const diputihkan = await putihkan(pSari);
      expect(diputihkan.isi).toMatchObject({
        status: "diputihkan",
        saldo: 800_000,
        alasanPemutihan: "macet_lama",
        nasabah: { diblokir: true, alasanBlokir: "Pinjaman ke-1 diputihkan (macet lama)" },
      });
      expect(kode(await putihkan(pSari))).toBe("SUDAH_DIPUTIHKAN");
      // Saldo & tabungan tak disentuh; tanggal macet tetap tersimpan.
      expect(await keadaan(pSari)).toMatchObject({ saldo: 800_000, tanggal_macet: "2026-10-01" });
      expect(await jejak(nSari)).toEqual(["blokir"]);

      // K2: nasabah diblokir tak bisa akad baru.
      await kirim("/lapangan/absen", {
        isi: { absensi: "masuk_kerja", kasLapangan: 0, uangJalan: 0 },
        token: k,
      });
      const [foto] = await baris<{ id: string }>(sql`
        insert into foto (kantor_id, jenis, kunci_berkas, sha256, ukuran_byte, tipe_mime, diunggah_oleh)
        values (${kantorId}, 'serah_terima', 'f', ${"c".repeat(64)}, 1000, 'image/webp', ${andiId})
        returning id`);
      const akad = await kirim("/lapangan/akad", {
        isi: {
          nasabah: { nasabahId: nSari },
          jenis: "harian",
          pokok: 1_000_000,
          tenor: 24,
          fotoSerahTerimaId: foto?.id,
        },
        token: k,
      });
      expect(kode(akad)).toBe("NASABAH_DIBLOKIR");

      const dibatalkan = await batal(pSari);
      expect(dibatalkan.isi).toMatchObject({ status: "macet", nasabah: { diblokir: false } });
      expect(await keadaan(pSari)).toMatchObject({ status: "macet", tanggal_macet: "2026-10-01" });
      expect(await jejak(nSari)).toEqual(["blokir", "buka_blokir"]);
      expect(await jejak(pSari)).toEqual(["batal_pemutihan"]);
      expect(kode(await batal(pSari))).toBe("BUKAN_DIPUTIHKAN");
      const statusRiwayat = await baris<{ j: string }>(sql`
        select status_sebelum || '>' || status_sesudah as j from riwayat_status_pinjaman
        where pinjaman_id = ${pSari} and status_sebelum is not null order by dibuat_at`);
      expect(statusRiwayat.map((r) => r.j)).toEqual([
        "berjalan>macet",
        "macet>diputihkan",
        "diputihkan>macet",
      ]);

      // ---- dua pemutihan: blokir bertahan selama masih ada yang diputihkan ---------------
      const nBudi = await nasabahBaru("Budi");
      const p1 = await pinjamanLama(nBudi, 1, null);
      await putihkan(p1);
      const buka = await kirim(`/nasabah/${nBudi}/buka-blokir`, {
        isi: { alasan: "keluarga melunasi di luar" },
        token: b,
      });
      expect(buka.isi).toMatchObject({ diblokir: false });
      expect(
        kode(await kirim(`/nasabah/${nBudi}/buka-blokir`, { isi: { alasan: "x" }, token: b })),
      ).toBe("TIDAK_DIBLOKIR");
      const p2 = await pinjamanLama(nBudi, 2, null);
      expect((await putihkan(p2)).isi.nasabah.alasanBlokir).toBe(
        "Pinjaman ke-2 diputihkan (macet lama)",
      );
      const batalP2 = await batal(p2);
      expect(batalP2.isi).toMatchObject({ status: "berjalan", nasabah: { diblokir: true } });
      // p1 tak bisa kembali aktif selama p2 masih berjalan.
      expect(kode(await batal(p1))).toBe("PINJAMAN_MASIH_AKTIF");
    });
  }, 60_000);
});
