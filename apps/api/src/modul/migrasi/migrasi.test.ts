import { describe, expect, test } from "bun:test";
import { geserTanggal } from "@opennael/domain";
import { sql } from "drizzle-orm";
import { dalamTransaksi, siapkanKantor, URL_DB } from "../../uji/bantu";

describe.skipIf(!URL_DB)("salinan migrasi (A10)", () => {
  test("salin orang baru & macet, tolak data salah, batal di hari disalin", async () => {
    await dalamTransaksi(async (tx) => {
      const { kirim, bos, kolektor: andi, kantorId } = await siapkanKantor(tx);
      const b = bos.tokenAkses;
      const andiId = andi.pengguna.id;
      const baris = async <T>(q: ReturnType<typeof sql>) => (await tx.execute(q)) as unknown as T[];
      const [h] = await baris<{ t: string }>(sql`select kantor_hari_ini(${kantorId})::text as t`);
      const hari = h?.t as string;
      const kode = (r: { isi: Record<string, unknown> }) => r.isi.kode;
      const dasar = {
        jenis: "harian",
        tenor: 24,
        pokok: 1_000_000,
        tanggalAkad: geserTanggal(hari, -20),
        saldo: 700_000,
        tabungan: 50_000,
      };

      // ---- contoh A10: orang baru, 10 angsuran terbayar di buku ------------------------
      const sari = await kirim("/pinjaman/migrasi", {
        isi: {
          ...dasar,
          nasabah: { nama: "Sari", kampung: { nama: "Pule" } },
          kolektorId: andiId,
          pinjamanKe: 3,
        },
        token: b,
      });
      expect(sari.status).toBe(201);
      expect(sari.isi).toMatchObject({
        nasabah: { nama: "Sari", baru: true },
        kolektor: { id: andiId, nama: "Andi" },
        pinjamanKe: 3,
        totalKembali: 1_200_000,
        angsuran: 50_000,
        angsuranKe: 10,
        saldo: 700_000,
        tabunganMasuk: 50_000,
        status: "berjalan",
        tanggalDisalin: hari,
      });
      const [p] = await baris<{
        asal: string;
        pencairan: string;
        droping: string;
        potongan_admin: string;
        pencair_id: string;
        dibuat_oleh: string;
        saldo_tabungan: string;
      }>(sql`
        select p.asal, p.pencairan, p.droping, p.potongan_admin, p.pencair_id, p.dibuat_oleh,
               n.saldo_tabungan
        from pinjaman p join nasabah n on n.id = p.nasabah_id where p.id = ${sari.isi.id}`);
      expect(p).toMatchObject({
        asal: "migrasi",
        pencair_id: andiId,
        dibuat_oleh: bos.pengguna.id,
      });
      expect([p?.pencairan, p?.droping, p?.potongan_admin].map(Number)).toEqual([0, 0, 0]);
      expect(Number(p?.saldo_tabungan)).toBe(50_000);
      // Tanpa uang keluar: bukan droping/akad di ringkasan.
      expect((await kirim("/ringkasan", { token: b })).isi.akad.jumlahAkad).toBe(0);

      // ---- yang di buku sudah macet ----------------------------------------------------
      const budi = await kirim("/pinjaman/migrasi", {
        isi: {
          ...dasar,
          jenis: "mingguan",
          tenor: 8,
          saldo: 450_000,
          tabungan: 0,
          macet: true,
          nasabah: { nama: "Budi", kampung: { nama: "Pule" } },
          kolektorId: andiId,
        },
        token: b,
      });
      expect(budi.status).toBe(201);
      expect(budi.isi).toMatchObject({ status: "macet", pinjamanKe: 1, angsuranKe: 5 });
      const jejak = await baris<{ s: string }>(sql`
        select status_sesudah::text as s from riwayat_status_pinjaman
        where pinjaman_id = ${budi.isi.id} order by dibuat_at`);
      expect(jejak.map((j) => j.s)).toEqual(["berjalan", "macet"]);

      // ---- ditolak ----------------------------------------------------------------------
      const sariId = sari.isi.nasabah.id as string;
      expect(
        kode(
          await kirim("/pinjaman/migrasi", {
            isi: { ...dasar, nasabah: { nasabahId: sariId } },
            token: b,
          }),
        ),
      ).toBe("PINJAMAN_MASIH_AKTIF");
      expect(
        (
          await kirim("/pinjaman/migrasi", {
            isi: { ...dasar, nasabah: { nama: "Tono", kampung: { nama: "Pule" } } },
            token: b,
          })
        ).status,
      ).toBe(400);
      const orangBaru = {
        nasabah: { nama: "Tono", kampung: { nama: "Pule" } },
        kolektorId: andiId,
      };
      expect(
        kode(
          await kirim("/pinjaman/migrasi", {
            isi: { ...dasar, ...orangBaru, saldo: 1_200_001 },
            token: b,
          }),
        ),
      ).toBe("SALDO_MIGRASI_TIDAK_SAH");
      expect(
        kode(
          await kirim("/pinjaman/migrasi", {
            isi: { ...dasar, ...orangBaru, tanggalAkad: geserTanggal(hari, 1) },
            token: b,
          }),
        ),
      ).toBe("TANGGAL_AKAD_DEPAN");
      expect(
        kode(
          await kirim("/pinjaman/migrasi", {
            isi: { ...dasar, ...orangBaru },
            token: andi.tokenAkses,
          }),
        ),
      ).toBe("PERAN_DILARANG");

      // ---- batal di hari disalin (juga yang macet); tabungan pembuka ditarik ----------
      const batal = await kirim(`/pinjaman/${sari.isi.id}/batal`, {
        isi: { alasan: "salah ketik" },
        token: b,
      });
      expect(batal.status).toBe(200);
      expect(batal.isi.tabunganDitarik).toBe(50_000);
      expect(
        (await kirim(`/pinjaman/${budi.isi.id}/batal`, { isi: { alasan: "dobel" }, token: b }))
          .status,
      ).toBe(200);
      const [n] = await baris<{ s: string }>(
        sql`select saldo_tabungan as s from nasabah where id = ${sariId}`,
      );
      expect(Number(n?.s)).toBe(0);
      // Nomor yang batal tak terpakai: salin ulang untuk nasabah lama memakai nomor berikutnya.
      const ulang = await kirim("/pinjaman/migrasi", {
        isi: { ...dasar, nasabah: { nasabahId: sariId } },
        token: b,
      });
      expect(ulang.isi).toMatchObject({ pinjamanKe: 1, nasabah: { baru: false } });

      // ---- aktivitas & kampung untuk bos ----------------------------------------------
      const aktivitas = (await kirim("/aktivitas", { token: b })).isi as unknown as {
        kejadian: string;
      }[];
      const kejadian = aktivitas.map((a) => a.kejadian);
      expect(kejadian.filter((k) => k === "salin_pinjaman")).toHaveLength(3);
      expect(kejadian.filter((k) => k === "batal_salin_pinjaman")).toHaveLength(2);
      const kampung = await kirim("/lapangan/kampung", { token: b });
      expect(kampung.status).toBe(200);
      expect(kampung.isi.map((k: { nama: string }) => k.nama)).toContain("Pule");
    });
  }, 60_000);
});
