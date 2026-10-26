import { describe, expect, test } from "bun:test";
import { sql } from "drizzle-orm";
import { dalamTransaksi, siapkanKantor, URL_DB } from "../../uji/bantu";

/**
 * Kampung ujung ke ujung: daftar & pemakaian, ganti nama, gabung (nasabah &
 * rute pindah, entri ganda dipadatkan, versi rute naik), hapus kampung kosong.
 * Semua di SATU transaksi yang dibatalkan.
 */
describe.skipIf(!URL_DB)("kampung", () => {
  test("daftar, ganti nama, gabung salah ketik, hapus kampung kosong", async () => {
    await dalamTransaksi(async (tx) => {
      const { kirim, bos, kolektor: andi, kantorId } = await siapkanKantor(tx);
      const b = bos.tokenAkses;
      const k = andi.tokenAkses;
      const andiId = andi.pengguna.id;
      const baris = async <T>(q: ReturnType<typeof sql>) => (await tx.execute(q)) as unknown as T[];

      const kampung = async (nama: string) => {
        const [w] = await baris<{ id: string }>(sql`
          insert into wilayah (kantor_id, nama, dibuat_oleh) values (${kantorId}, ${nama}, ${andiId})
          returning id`);
        return w?.id as string;
      };
      const pule = await kampung("Pule");
      const puleh = await kampung("Puleh");
      const sawah = await kampung("Sawah");
      const kosong = await kampung("Kosong");
      const orang = async (nama: string, wilayahId: string) => {
        const [n] = await baris<{ id: string }>(sql`
          insert into nasabah (kantor_id, kolektor_id, nama, wilayah_id)
          values (${kantorId}, ${andiId}, ${nama}, ${wilayahId}) returning id`);
        return n?.id as string;
      };
      await orang("Ani", pule);
      await orang("Budi", puleh);
      const citra = await orang("Citra", puleh);
      await tx.execute(sql`
        insert into pinjaman (kantor_id, pencair_id, dibuat_oleh, nasabah_id, pinjaman_ke, jenis, tenor,
          asal, tanggal_akad, tanggal_disalin, pokok, potongan_admin, tabungan_masuk, pencairan,
          total_kembali, angsuran, saldo_awal, drop_baru, saldo)
        values (${kantorId}, ${andiId}, ${bos.pengguna.id}, ${citra}, 1, 'harian', 24, 'migrasi',
          '2026-09-01', '2026-09-01', 1000000, 0, 0, 0, 1200000, 50000, 1200000, 0, 1200000)`);
      // Rute Andi: Puleh, Sawah, Pule.
      const simpan = await kirim("/rute-kolektor", {
        metode: "PUT",
        isi: {
          urutan: [{ wilayahId: puleh }, { wilayahId: sawah }, { wilayahId: pule }],
          versi: 0,
        },
        token: k,
      });
      expect(simpan.isi.versi).toBe(1);
      const jejak = async (aksi: string) =>
        baris<{ sebelum: unknown; sesudah: unknown }>(sql`
          select sebelum, sesudah from riwayat_perubahan
          where aksi = ${aksi} and kantor_id = ${kantorId}`);

      // Daftar & pemakaian (semua peran); saringan "baru" hanya bos.
      const daftar = await kirim("/wilayah", { token: k });
      expect(daftar.status).toBe(200);
      expect(daftar.isi.map((w: { nama: string }) => w.nama)).toEqual([
        "Kosong",
        "Pule",
        "Puleh",
        "Sawah",
      ]);
      expect(daftar.isi[2]).toMatchObject({
        id: puleh,
        kunci: "puleh",
        nasabahAktif: 1,
        nasabahTotal: 2,
        dipakaiRute: 1,
        dibuatOleh: { id: andiId, nama: "Andi" },
      });
      expect((await kirim("/wilayah?baru=7", { token: k })).status).toBe(403);
      expect((await kirim("/wilayah?baru=7", { token: b })).isi).toHaveLength(4);

      // Ganti nama: nama dirapikan; versi rute yang memuatnya naik.
      const ganti = (dari: string, ke: string, token = b) =>
        kirim("/wilayah/ganti-nama", { isi: { dari, ke }, token });
      expect((await ganti(sawah, "Sawah Lor", k)).status).toBe(403);
      const lor = await ganti(sawah, "  Sawah   Lor ");
      expect(lor.isi).toMatchObject({ id: sawah, nama: "Sawah Lor", digabung: false });
      expect((await ganti(sawah, "Sawah Lor")).isi.kode).toBe("TIDAK_ADA_PERUBAHAN");
      expect(await jejak("ganti_nama_wilayah")).toEqual([
        { sebelum: { nama: "Sawah" }, sesudah: { nama: "Sawah Lor" } },
      ]);

      // Gabung salah ketik: "Puleh" → "pule" (kunci Pule sudah ada).
      const gabung = await ganti(puleh, "pule");
      expect(gabung.isi).toMatchObject({
        id: pule,
        nama: "Pule",
        nasabahTotal: 3,
        nasabahAktif: 1,
        dipakaiRute: 1,
        digabung: true,
      });
      expect(await jejak("gabung_wilayah")).toEqual([
        { sebelum: { id: puleh, nama: "Puleh" }, sesudah: { id: pule, nama: "Pule" } },
      ]);
      // Rute: Puleh→Pule lalu dipadatkan (posisi paling depan), urutan rapat.
      const rute = await kirim("/rute-kolektor", { token: k });
      expect(rute.isi).toMatchObject({
        versi: 3,
        urutan: [
          { wilayahId: pule, nama: "Pule" },
          { wilayahId: sawah, nama: "Sawah Lor" },
        ],
      });
      expect((await kirim("/wilayah", { token: b })).isi.map((w: { id: string }) => w.id)).toEqual([
        kosong,
        pule,
        sawah,
      ]);

      // Hapus: masih dipakai nasabah / rute → 409; kampung kosong terhapus.
      const hapus = (id: string, token = b) => kirim(`/wilayah/${id}`, { metode: "DELETE", token });
      expect((await hapus(pule)).isi.kode).toBe("WILAYAH_MASIH_DIPAKAI");
      expect((await hapus(sawah)).isi.kode).toBe("WILAYAH_MASIH_DIPAKAI");
      expect((await hapus(kosong, k)).status).toBe(403);
      const terhapus = await hapus(kosong);
      expect([terhapus.status, terhapus.isi]).toEqual([200, { id: kosong, nama: "Kosong" }]);
      expect(await jejak("hapus_wilayah")).toEqual([
        { sebelum: { nama: "Kosong" }, sesudah: null },
      ]);
      expect((await hapus(kosong)).status).toBe(404);
    });
  }, 60_000);
});
