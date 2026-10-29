import { describe, expect, test } from "bun:test";
import type { Sesi } from "@opennael/contracts";
import { sql } from "drizzle-orm";
import { dalamTransaksi, siapkanKantor, URL_DB } from "../../../uji/bantu";

/**
 * Setoran sore ujung ke ujung (HTTP → layanan → database) di SATU transaksi
 * yang dibatalkan. Angka mengikuti contoh aturan-usaha I2: tunai seharusnya
 * 1.250.000, kasir menerima 1.200.000 → tekor 50.000.
 */
describe.skipIf(!URL_DB)("setoran sore", () => {
  test("hitung buta, tekor, hari terkunci, batal bos, terima ulang", async () => {
    await dalamTransaksi(async (tx) => {
      const { kirim, bos, kolektor: andi, kantorId } = await siapkanKantor(tx);
      const b = bos.tokenAkses;
      const k = andi.tokenAkses;
      const andiId = andi.pengguna.id;

      // HP kasir ditautkan bos.
      const t = await kirim("/auth/tautan", { isi: {} });
      await kirim("/auth/tautan/setujui", {
        isi: { kode: t.isi.kode, akun: { peran: "kasir", nama: "Sari" } },
        token: b,
      });
      const kasir = (await kirim(`/auth/tautan/${t.isi.id}/klaim`, { isi: { klaim: t.isi.klaim } }))
        .isi as Sesi;
      const ks = kasir.tokenAkses;

      // Pegangan Andi: dua pinjaman salinan migrasi (saldo 2 jt).
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
          values (${kantorId}, ${andiId}, ${bos.pengguna.id}, ${n?.id}, 1, 'harian', 24, 'migrasi',
            '2026-09-01', '2026-10-01', 2000000, 0, 0, 0, 2400000, 100000, 2000000, 0, 2000000)
          returning id`)) as unknown as { id: string }[];
        return p?.id as string;
      };
      const pBudi = await pinjamanLama("Budi");
      const pTono = await pinjamanLama("Tono");
      const [foto] = (await tx.execute(sql`
        insert into foto (kantor_id, jenis, kunci_berkas, sha256, ukuran_byte, tipe_mime, diunggah_oleh)
        values (${kantorId}, 'serah_terima', 'f', ${"a".repeat(64)}, 1000, 'image/webp', ${andiId})
        returning id`)) as unknown as { id: string }[];

      // ---- lapangan Andi: kas 1 jt, akad 1 jt, storting 1,25 jt -------------
      await kirim("/lapangan/absen", {
        isi: { absensi: "masuk_kerja", kasLapangan: 1_000_000, uangJalan: 50_000 },
        token: k,
      });
      const akad = await kirim("/lapangan/akad", {
        isi: {
          nasabah: { nama: "Sari", kampung: { nama: "Pule" } },
          jenis: "harian",
          pokok: 1_000_000,
          tenor: 24,
          fotoSerahTerimaId: foto?.id,
        },
        token: k,
      });
      expect(akad.status).toBe(201);
      const setorBudi = await kirim("/lapangan/bayar", {
        isi: { pinjamanId: pBudi, setoranMurni: 1_200_000 },
        token: k,
      });
      expect(setorBudi.status).toBe(201);
      const setorTono = await kirim("/lapangan/bayar", {
        isi: { pinjamanId: pTono, setoranMurni: 50_000 },
        token: k,
      });

      // ---- kasir: transfer & biaya ------------------------------------------
      const tf = await kirim("/transfer-setoran", {
        isi: { transaksiId: setorBudi.isi.id, nominal: 70_000 },
        token: ks,
      });
      expect(tf.status).toBe(201);
      expect(tf.isi).toMatchObject({ nominal: 70_000, nasabah: { nama: "Budi" } });
      expect(
        (
          await kirim("/transfer-setoran", {
            isi: { transaksiId: setorBudi.isi.id, nominal: 10_000 },
            token: ks,
          })
        ).isi.kode,
      ).toBe("TRANSFER_SUDAH_ADA");
      expect(
        (
          await kirim("/transfer-setoran", {
            isi: { transaksiId: setorTono.isi.id, nominal: 50_001 },
            token: ks,
          })
        ).isi.kode,
      ).toBe("TRANSFER_MELEBIHI_SETORAN");
      expect(
        (
          await kirim("/transfer-setoran", {
            isi: { transaksiId: setorTono.isi.id, nominal: 1_000 },
            token: k,
          })
        ).isi.kode,
      ).toBe("PERAN_DILARANG");
      const biaya = await kirim("/biaya-tak-terduga", {
        isi: { kolektorId: andiId, nominal: 30_000, keterangan: "ganti ban dalam" },
        token: ks,
      });
      expect(biaya.status).toBe(201);
      expect(biaya.isi).toMatchObject({ nominal: 30_000, kolektor: { nama: "Andi" } });

      const setoran = await kirim(`/transaksi?kolektorId=${andiId}`, { token: ks });
      expect(setoran.isi).toHaveLength(2);
      expect(setoran.isi.find((s: { id: string }) => s.id === setorBudi.isi.id)).toMatchObject({
        batasTransfer: 1_200_000,
        transfer: { id: tf.isi.id, nominal: 70_000 },
      });

      // ---- hitung buta ----------------------------------------------------------
      const RINCIAN = {
        kasLapangan: 1_000_000,
        storting: 1_250_000,
        tabunganMasuk: 50_000,
        potonganAdmin: 50_000,
        droping: 1_000_000,
        transfer: 70_000,
        biaya: 30_000,
        tunaiSeharusnya: 1_250_000,
      };
      const lihatKasir = await kirim(`/hari-kolektor?kolektorId=${andiId}`, { token: ks });
      expect(lihatKasir.isi[0]).toMatchObject({ rincian: null, serahTerima: null });
      // Kolektor melihat angka yang harus ia serahkan.
      const lihatAndi = await kirim("/hari-kolektor", { token: k });
      expect(lihatAndi.isi).toHaveLength(1);
      expect(lihatAndi.isi[0].rincian).toEqual(RINCIAN);
      expect(
        (await kirim(`/hari-kolektor?kolektorId=${bos.pengguna.id}`, { token: k })).isi.kode,
      ).toBe("BUKAN_MILIK_ANDA");

      // ---- terima kas -------------------------------------------------------------
      const terima = (tunaiDiterima: number, token = ks) =>
        kirim(`/hari-kolektor/${andiId}/terima-kas`, { isi: { tunaiDiterima }, token });
      expect((await terima(1_200_000)).isi.kode).toBe("LAPORAN_BELUM_DIBUKA");
      await kirim("/lapangan/laporan", { isi: {}, token: k });
      expect((await terima(1_200_000, k)).isi.kode).toBe("PERAN_DILARANG");
      const diterima = await terima(1_200_000);
      expect(diterima.status).toBe(201);
      expect(diterima.isi.rincian).toEqual(RINCIAN);
      expect(diterima.isi.serahTerima).toMatchObject({
        tunaiSeharusnya: 1_250_000,
        tunaiDiterima: 1_200_000,
        selisihSetor: -50_000,
        tekor: 50_000,
        lebihSetor: 0,
        diterimaOleh: { nama: "Sari" },
      });
      expect((await terima(1_200_000)).isi.kode).toBe("KAS_SUDAH_DITERIMA");
      // Kolektor langsung melihat hasilnya.
      expect((await kirim("/hari-kolektor", { token: k })).isi[0].serahTerima.tekor).toBe(50_000);

      // ---- hari terkunci (I4) -------------------------------------------------------
      const terkunci = [
        await kirim("/transfer-setoran", {
          isi: { transaksiId: setorTono.isi.id, nominal: 50_000 },
          token: ks,
        }),
        await kirim("/biaya-tak-terduga", {
          isi: { kolektorId: andiId, nominal: 10_000, keterangan: "bensin" },
          token: ks,
        }),
        await kirim(`/transfer-setoran/${tf.isi.id}/batal`, { isi: { alasan: "x" }, token: b }),
        await kirim(`/biaya-tak-terduga/${biaya.isi.id}/batal`, { isi: { alasan: "x" }, token: b }),
      ];
      expect(terkunci.map((r) => [r.status, r.isi.kode])).toEqual(
        Array(4).fill([409, "KAS_SUDAH_DITERIMA"]),
      );

      // ---- bos membatalkan penerimaan, kasir menerima ulang ---------------------------
      const idSerah = diterima.isi.serahTerima.id;
      expect(
        (await kirim(`/serah-terima-kas/${idSerah}/batal`, { isi: { alasan: "x" }, token: ks })).isi
          .kode,
      ).toBe("PERAN_DILARANG");
      const dibatalkan = await kirim(`/serah-terima-kas/${idSerah}/batal`, {
        isi: { alasan: "transfer Tono terlewat" },
        token: b,
      });
      expect(dibatalkan.status).toBe(200);
      expect(dibatalkan.isi.serahTerima).toBeNull();
      expect(
        (await kirim(`/serah-terima-kas/${idSerah}/batal`, { isi: { alasan: "x" }, token: b })).isi
          .kode,
      ).toBe("SUDAH_DIBATALKAN");
      // Sebelum diterima ulang, kasir kembali tak melihat angka seharusnya.
      expect(
        (await kirim(`/hari-kolektor?kolektorId=${andiId}`, { token: ks })).isi[0].rincian,
      ).toBeNull();

      const tfTono = await kirim("/transfer-setoran", {
        isi: { transaksiId: setorTono.isi.id, nominal: 50_000 },
        token: ks,
      });
      expect(tfTono.status).toBe(201);
      const daftarTf = await kirim(`/transfer-setoran?kolektorId=${andiId}`, { token: ks });
      expect(daftarTf.isi.total).toBe(120_000);
      const batalBiaya = await kirim(`/biaya-tak-terduga/${biaya.isi.id}/batal`, {
        isi: { alasan: "nota ganda" },
        token: b,
      });
      expect(batalBiaya.isi.alasanBatal).toBe("nota ganda");
      const daftarBiaya = await kirim(`/biaya-tak-terduga?termasukBatal=ya`, { token: ks });
      expect(daftarBiaya.isi.biaya).toHaveLength(1);
      expect(daftarBiaya.isi.total).toBe(0);

      // Seharusnya kini 1.250.000 − 50.000 (transfer Tono) + 30.000 (biaya batal) = 1.230.000.
      const ulang = await terima(1_230_000);
      expect(ulang.status).toBe(201);
      expect(ulang.isi.serahTerima).toMatchObject({
        tunaiSeharusnya: 1_230_000,
        selisihSetor: 0,
        tekor: 0,
      });
    });
  }, 60_000);
});
