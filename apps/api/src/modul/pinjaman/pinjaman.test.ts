import { describe, expect, test } from "bun:test";
import { geserTanggal } from "@opennael/domain";
import { sql } from "drizzle-orm";
import { dalamTransaksi, siapkanKantor, URL_DB } from "../../uji/bantu";

/**
 * Kartu & rincian pinjaman ujung ke ujung. Tanggal relatif terhadap hari ini
 * kantor (T); pekan kerja tiap hari sejak T−60, jadi hari tagih = hari
 * kalender. Semua di SATU transaksi yang dibatalkan.
 */
describe.skipIf(!URL_DB)("pinjaman", () => {
  test("kartu: posisi tagih B5, kunci gulung, saringan, pegangan, rincian, sunting, riwayat", async () => {
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
      const t = (n: number) => geserTanggal(T, n);

      await tx.execute(sql`select set_config('nael.migrasi_data', 'ya', true)`);
      await tx.execute(sql`
        insert into pekan_kerja (kantor_id, berlaku_mulai, hari_kerja, dibuat_oleh)
        values (${kantorId}, ${t(-60)}, 127, ${bos.pengguna.id})`);
      await tx.execute(sql`select set_config('nael.migrasi_data', '', true)`);
      const [dedi] = await baris<{ id: string }>(sql`
        insert into pengguna (kantor_id, peran, nama) values (${kantorId}, 'kolektor', 'Dedi') returning id`);
      const [w] = await baris<{ id: string }>(sql`
        insert into wilayah (kantor_id, nama, dibuat_oleh) values (${kantorId}, 'Pule', ${andiId}) returning id`);

      const orang = async (nama: string, pemegang = andiId) => {
        const [n] = await baris<{ id: string }>(sql`
          insert into nasabah (kantor_id, kolektor_id, nama, wilayah_id)
          values (${kantorId}, ${pemegang}, ${nama}, ${w?.id}) returning id`);
        return n?.id as string;
      };
      /** Salinan migrasi (tanpa foto) — jalan pintas data uji. */
      const pinjamanLama = async (isi: {
        nasabahId: string;
        pemegang?: string;
        ke?: number;
        jenis?: "harian" | "tempoan";
        tanggalAkad: string;
        saldo: number;
        status?: "berjalan" | "lunas";
      }) => {
        const tempoan = isi.jenis === "tempoan";
        const total = tempoan ? 1_250_000 : 1_200_000;
        const lunas = isi.status === "lunas";
        const [p] = await baris<{ id: string }>(sql`
          insert into pinjaman (kantor_id, pencair_id, dibuat_oleh, nasabah_id, pinjaman_ke, jenis, tenor,
            asal, tanggal_akad, tanggal_disalin, pokok, potongan_admin, tabungan_masuk, pencairan,
            total_kembali, angsuran, saldo_awal, drop_baru, saldo, status, tanggal_selesai)
          values (${kantorId}, ${isi.pemegang ?? andiId}, ${bos.pengguna.id}, ${isi.nasabahId},
            ${isi.ke ?? 1}, ${isi.jenis ?? "harian"}, ${tempoan ? 14 : 24}, 'migrasi', ${isi.tanggalAkad},
            ${isi.tanggalAkad}, 1000000, 0, 0, 0, ${total}, ${tempoan ? total : 50_000}, ${total}, 0,
            ${lunas ? 0 : isi.saldo}, ${isi.status ?? "berjalan"}, ${lunas ? t(-10) : null})
          returning id`);
        return p?.id as string;
      };

      // A: harian disalin T−5 (5 hari tagih s/d kemarin), 3 angsuran lunas,
      // libur sekali (T−2) → tertinggal 1. Pinjaman pertamanya sudah lunas.
      const a = await orang("Ani");
      const aLunas = await pinjamanLama({
        nasabahId: a,
        tanggalAkad: t(-40),
        saldo: 0,
        status: "lunas",
      });
      const aAktif = await pinjamanLama({
        nasabahId: a,
        ke: 2,
        tanggalAkad: t(-5),
        saldo: 1_050_000,
      });
      await tx.execute(sql`
        insert into libur_nasabah (kantor_id, pencatat_id, pinjaman_id, tanggal)
        values (${kantorId}, ${andiId}, ${aAktif}, ${t(-2)})`);
      await tx.execute(sql`
        insert into transaksi (kantor_id, pencatat_id, pinjaman_id, tanggal, jenis, setoran_murni, saldo_sesudah)
        values (${kantorId}, ${andiId}, ${aAktif}, ${t(-1)}, 'angsuran', 150000, 1050000)`);

      // B: tempoan jatuh tempo T−6 → seluruh saldo tertunggak; gulung dikunci bos.
      const bNasabah = await orang("Budi");
      const bPinjaman = await pinjamanLama({
        nasabahId: bNasabah,
        jenis: "tempoan",
        tanggalAkad: t(-20),
        saldo: 1_250_000,
      });
      const rem = await kirim(`/kebijakan/nasabah/${bNasabah}`, {
        metode: "PUT",
        isi: { naikPinjamanDikunci: false, gulungPinjamanDikunci: true, alasanKunci: "Tunggakan" },
        token: b,
      });
      expect(rem.status).toBe(200);

      // C: pegangan Dedi — tidak terlihat oleh Andi.
      const cPinjaman = await pinjamanLama({
        nasabahId: await orang("Citra", dedi?.id),
        pemegang: dedi?.id,
        tanggalAkad: t(-3),
        saldo: 1_200_000,
      });

      // Daftar aktif (bos): A-aktif, B, C — urut nama.
      const semuaAktif = await kirim("/pinjaman", { token: b });
      expect(semuaAktif.status).toBe(200);
      expect(semuaAktif.isi.map((p: { id: string }) => p.id)).toEqual([
        aAktif,
        bPinjaman,
        cPinjaman,
      ]);
      const kartuA = semuaAktif.isi[0];
      const kartuB = semuaAktif.isi[1];
      expect(kartuA.tagih).toEqual({ tertinggal: 1, tunggakan: 50_000 });
      expect(kartuA.kolektor).toEqual({ id: andiId, nama: "Andi" });
      expect(kartuA.kunciGulung).toEqual({ gulung: false, naik: false, alasan: null });
      expect(kartuB.tagih).toEqual({ tertinggal: 1, tunggakan: 1_250_000 });
      expect(kartuB.kunciGulung).toEqual({ gulung: true, naik: false, alasan: "Tunggakan" });

      // Riwayat satu nasabah: semua status, pinjamanKe menurun; yang selesai tanpa tagih.
      const riwayatA = await kirim(`/pinjaman?status=semua&nasabahId=${a}`, { token: b });
      expect(riwayatA.isi.map((p: { id: string }) => p.id)).toEqual([aAktif, aLunas]);
      expect(riwayatA.isi[1]).toMatchObject({ status: "lunas", tagih: null, kunciGulung: null });
      const selesai = await kirim("/pinjaman?status=selesai", { token: b });
      expect(selesai.isi.map((p: { id: string }) => p.id)).toEqual([aLunas]);

      // Kolektor: hanya pegangannya.
      const milikAndi = await kirim("/pinjaman", { token: k });
      expect(milikAndi.isi.map((p: { id: string }) => p.id)).toEqual([aAktif, bPinjaman]);
      expect((await kirim(`/pinjaman?kolektorId=${dedi?.id}`, { token: k })).status).toBe(403);
      expect((await kirim(`/pinjaman/${cPinjaman}`, { token: k })).isi.kode).toBe(
        "BUKAN_PEGANGAN_ANDA",
      );

      // Rincian: aturan macet jendela 30 hari yang berakhir hari ini.
      const rincianA = await kirim(`/pinjaman/${aAktif}`, { token: k });
      expect(rincianA.status).toBe(200);
      expect(rincianA.isi).toMatchObject({
        pencair: { id: andiId, nama: "Andi" },
        tanggalDisalin: t(-5),
        tagih: { tertinggal: 1, tunggakan: 50_000 },
        aturanMacet: {
          jendelaAwal: t(-29),
          jendelaAkhir: T,
          setoranJendela: 150_000,
          ambang: 250_000,
          // Mulai ditagih T−5 s/d hari ini: 6 hari — belum 15, belum dinilai.
          hariTagih: 6,
          batasTempoan: null,
          dievaluasi: false,
          statusMalamIni: "berjalan",
        },
      });
      const rincianB = await kirim(`/pinjaman/${bPinjaman}`, { token: b });
      expect(rincianB.isi.aturanMacet).toMatchObject({
        ambang: null,
        hariTagih: null,
        batasTempoan: t(1),
        statusMalamIni: "berjalan",
      });
      expect((await kirim(`/pinjaman/${aLunas}`, { token: b })).isi.aturanMacet).toBeNull();

      // Sunting nomor urut (bos): bentrok, sama, berhasil + jejak.
      const ubah = (ke: number, token = b) =>
        kirim(`/pinjaman/${aAktif}`, { metode: "PATCH", isi: { pinjamanKe: ke }, token });
      expect((await ubah(5, k)).status).toBe(403);
      const bentrok = await ubah(1);
      expect([bentrok.status, bentrok.isi.kode]).toEqual([409, "PINJAMAN_KE_DIPAKAI"]);
      expect((await ubah(2)).isi.kode).toBe("TIDAK_ADA_PERUBAHAN");
      const jadi = await ubah(5);
      expect([jadi.status, jadi.isi.pinjamanKe]).toEqual([200, 5]);
      const jejak = await baris<{ aksi: string; sebelum: unknown; sesudah: unknown }>(sql`
        select aksi, sebelum, sesudah from riwayat_perubahan where baris_id = ${aAktif}`);
      expect(jejak).toEqual([
        { aksi: "ubah_pinjaman_ke", sebelum: { pinjamanKe: 2 }, sesudah: { pinjamanKe: 5 } },
      ]);

      // Garis waktu status (bos, pengawas): baris kelahiran dari trigger.
      const garis = await kirim(`/pinjaman/${aAktif}/riwayat-status`, { token: b });
      expect(garis.isi).toMatchObject([{ statusSebelum: null, statusSesudah: "berjalan" }]);
      expect((await kirim(`/pinjaman/${aAktif}/riwayat-status`, { token: k })).status).toBe(403);
      expect(
        (await kirim("/pinjaman/00000000-0000-4000-8000-000000000000", { token: b })).status,
      ).toBe(404);
    });
  }, 60_000);
});
