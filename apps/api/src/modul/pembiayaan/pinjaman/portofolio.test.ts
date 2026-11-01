import { describe, expect, test } from "bun:test";
import { sql } from "drizzle-orm";
import { dalamTransaksi, siapkanKantor, URL_DB } from "../../../uji/bantu";

/**
 * Portofolio pegangan kolektor (`GET /lapangan/portofolio`) — di SATU transaksi
 * yang dibatalkan: per jenis, hanya berjalan, macet, dan diputihkan milik
 * pemegangnya yang dihitung; lunas dan pegangan kolektor lain tidak.
 */
describe.skipIf(!URL_DB)("portofolio kolektor", () => {
  test("jumlah & saldo per jenis dan status, hanya pegangan sendiri, mengikuti pemutihan", async () => {
    await dalamTransaksi(async (tx) => {
      const { kirim, bos, kolektor: andi, kantorId } = await siapkanKantor(tx);
      const b = bos.tokenAkses;
      const k = andi.tokenAkses;
      const andiId = andi.pengguna.id;
      const kode = (r: { isi: Record<string, unknown> }) => r.isi.kode;
      const baris = async <T>(q: ReturnType<typeof sql>) => (await tx.execute(q)) as unknown as T[];

      const [dedi] = await baris<{ id: string }>(sql`
        insert into pengguna (kantor_id, peran, nama) values (${kantorId}, 'kolektor', 'Dedi')
        returning id`);
      const [w] = await baris<{ id: string }>(sql`
        insert into wilayah (kantor_id, nama, dibuat_oleh) values (${kantorId}, 'Pule', ${andiId})
        returning id`);
      const nasabahBaru = async (nama: string, pemegang: string) =>
        (
          await baris<{ id: string }>(sql`
            insert into nasabah (kantor_id, kolektor_id, nama, wilayah_id)
            values (${kantorId}, ${pemegang}, ${nama}, ${w?.id}) returning id`)
        )[0]?.id as string;
      /** Tenor & angsuran tiap jenis: harian 24 × 50.000, mingguan 8 × 150.000, tempoan 14 hari sekali bayar. */
      const BENTUK = {
        harian: { tenor: 24, angsuran: 50_000, total: 1_200_000 },
        mingguan: { tenor: 8, angsuran: 150_000, total: 1_200_000 },
        tempoan: { tenor: 14, angsuran: 1_250_000, total: 1_250_000 },
      } as const;
      /** Salinan migrasi — jalan pintas data uji. */
      const pinjamanLama = async (isi: {
        nasabahId: string;
        pemegang: string;
        jenis?: keyof typeof BENTUK;
        ke?: number;
        saldo: number;
        status: "berjalan" | "macet" | "lunas";
      }) => {
        const lunas = isi.status === "lunas";
        const macet = isi.status === "macet";
        const jenis = isi.jenis ?? "harian";
        const { tenor, angsuran, total } = BENTUK[jenis];
        return (
          await baris<{ id: string }>(sql`
            insert into pinjaman (kantor_id, pencair_id, dibuat_oleh, nasabah_id, pinjaman_ke, jenis, tenor,
              asal, tanggal_akad, tanggal_disalin, pokok, potongan_admin, tabungan_masuk, pencairan,
              total_kembali, angsuran, saldo_awal, drop_baru, saldo, status, tanggal_macet, tanggal_selesai)
            values (${kantorId}, ${isi.pemegang}, ${bos.pengguna.id}, ${isi.nasabahId}, ${isi.ke ?? 1},
              ${jenis}, ${tenor}, 'migrasi', '2026-08-01', '2026-09-01', 1000000, 0, 0, 0, ${total}, ${angsuran},
              ${total}, 0, ${lunas ? 0 : isi.saldo}, ${isi.status}, ${macet ? "2026-10-01" : null},
              ${lunas ? "2026-09-15" : null})
            returning id`)
        )[0]?.id as string;
      };

      const ani = await nasabahBaru("Ani", andiId);
      const budi = await nasabahBaru("Budi", andiId);
      const citra = await nasabahBaru("Citra", andiId);
      const dewi = await nasabahBaru("Dewi", andiId);
      const eko = await nasabahBaru("Eko", dedi?.id as string);

      // Ani: pinjaman harian pertama sudah lunas (tak dihitung), kedua berjalan.
      await pinjamanLama({ nasabahId: ani, pemegang: andiId, ke: 1, saldo: 0, status: "lunas" });
      await pinjamanLama({
        nasabahId: ani,
        pemegang: andiId,
        ke: 2,
        saldo: 800_000,
        status: "berjalan",
      });
      // Budi: mingguan berjalan. Citra: tempoan macet. Dewi: harian macet (lalu diputihkan).
      await pinjamanLama({
        nasabahId: budi,
        pemegang: andiId,
        jenis: "mingguan",
        saldo: 400_000,
        status: "berjalan",
      });
      await pinjamanLama({
        nasabahId: citra,
        pemegang: andiId,
        jenis: "tempoan",
        saldo: 500_000,
        status: "macet",
      });
      const pDewi = await pinjamanLama({
        nasabahId: dewi,
        pemegang: andiId,
        saldo: 300_000,
        status: "macet",
      });
      // Pegangan kolektor lain tak ikut.
      await pinjamanLama({
        nasabahId: eko,
        pemegang: dedi?.id as string,
        saldo: 999_000,
        status: "berjalan",
      });

      const baca = async () => (await kirim("/lapangan/portofolio", { token: k })).isi;
      const nol = { jumlah: 0, saldo: 0 };

      // Tanpa masuk ditolak; bos bukan kolektor: ringkasan ini milik pegangan, bukan kantor.
      expect(kode(await kirim("/lapangan/portofolio"))).toBe("BELUM_MASUK");
      expect(kode(await kirim("/lapangan/portofolio", { token: b }))).toBe("PERAN_DILARANG");

      expect(await baca()).toEqual({
        harian: {
          berjalan: { jumlah: 1, saldo: 800_000 },
          macet: { jumlah: 1, saldo: 300_000 },
          diputihkan: nol,
        },
        mingguan: { berjalan: { jumlah: 1, saldo: 400_000 }, macet: nol, diputihkan: nol },
        tempoan: { berjalan: nol, macet: { jumlah: 1, saldo: 500_000 }, diputihkan: nol },
      });

      // Pemutihan memindahkan pinjaman macet ke diputihkan; saldonya tak disentuh.
      const putih = await kirim(`/pinjaman/${pDewi}/putihkan`, {
        isi: { alasan: "macet_lama", keterangan: "tak tertagih 6 bulan" },
        token: b,
      });
      expect(putih.isi).toMatchObject({ status: "diputihkan", saldo: 300_000 });
      expect((await baca()).harian).toEqual({
        berjalan: { jumlah: 1, saldo: 800_000 },
        macet: nol,
        diputihkan: { jumlah: 1, saldo: 300_000 },
      });

      // Batal pemutihan: kembali macet.
      await kirim(`/pinjaman/${pDewi}/putihkan/batal`, {
        isi: { alasan: "salah pinjaman" },
        token: b,
      });
      expect((await baca()).harian).toEqual({
        berjalan: { jumlah: 1, saldo: 800_000 },
        macet: { jumlah: 1, saldo: 300_000 },
        diputihkan: nol,
      });
    });
  });
});
