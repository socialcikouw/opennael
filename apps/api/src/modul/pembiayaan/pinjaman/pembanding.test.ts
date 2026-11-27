import { describe, expect, test } from "bun:test";
import { geserTanggal } from "@opennael/domain";
import { sql } from "drizzle-orm";
import { dalamTransaksi, siapkanKantor, URL_DB } from "../../../uji/bantu";

/**
 * Pembanding Portofolio (`GET /lapangan/portofolio` → `pembanding`, 28 Nov 2026): potret
 * terakhir bulan lalu & arus bulan ini vs rentang sepadan bulan lalu.
 */
describe.skipIf(!URL_DB)("pembanding portofolio", () => {
  test("potret akhir bulan lalu, lunas & macet baru per rentang, pegangan sendiri", async () => {
    await dalamTransaksi(async (tx) => {
      const { kirim, bos, kolektor: andi, kantorId } = await siapkanKantor(tx);
      const andiId = andi.pengguna.id;
      const baris = async <T>(q: ReturnType<typeof sql>) => (await tx.execute(q)) as unknown as T[];
      const [h] = await baris<{ t: string }>(sql`select kantor_hari_ini(${kantorId})::text as t`);
      const hari = h?.t as string;
      const awalIni = `${hari.slice(0, 7)}-01`;
      const akhirLalu = geserTanggal(awalIni, -1);
      const awalLalu = `${akhirLalu.slice(0, 7)}-01`;

      // Potret akhir bulan lalu (dan satu potret lebih awal yang tak boleh dipakai).
      await tx.execute(sql`
        insert into posisi_harian (kantor_id, kolektor_id, tanggal, jenis, jumlah_berjalan, jumlah_macet,
          saldo_berjalan, saldo_macet, angsuran_berjalan, angsuran_macet)
        values (${kantorId}, ${andiId}, ${akhirLalu}, 'harian', 10, 1, 5000000, 300000, 250000, 25000),
               (${kantorId}, ${andiId}, ${awalLalu}, 'harian', 99, 9, 9, 9, 9, 9)`);

      const [w] = await baris<{ id: string }>(sql`
        insert into wilayah (kantor_id, nama, dibuat_oleh) values (${kantorId}, 'pule', ${andiId})
        returning id`);
      const nasabahBaru = async (nama: string) =>
        (
          await baris<{ id: string }>(sql`
            insert into nasabah (kantor_id, kolektor_id, nama, wilayah_id)
            values (${kantorId}, ${andiId}, ${nama}, ${w?.id}) returning id`)
        )[0]?.id as string;
      const pinjaman = async (isi: {
        nasabahId: string;
        status: "lunas" | "macet";
        tanggal: string;
      }) =>
        tx.execute(sql`
          insert into pinjaman (kantor_id, pencair_id, dibuat_oleh, nasabah_id, pinjaman_ke, jenis, tenor,
            asal, tanggal_akad, tanggal_disalin, pokok, potongan_admin, tabungan_masuk, pencairan,
            total_kembali, angsuran, saldo_awal, drop_baru, saldo, status, tanggal_macet, tanggal_selesai)
          values (${kantorId}, ${andiId}, ${bos.pengguna.id}, ${isi.nasabahId}, 1, 'harian', 25,
            'migrasi', '2026-01-01', '2026-01-02', 1000000, 0, 0, 0, 1250000, 50000, 1250000, 0,
            ${isi.status === "lunas" ? 0 : 500000}, ${isi.status},
            ${isi.status === "macet" ? isi.tanggal : null}, ${isi.status === "lunas" ? isi.tanggal : null})`);
      // Lunas: satu bulan ini, dua bulan lalu (di rentang sepadan); macet baru: satu bulan ini.
      await pinjaman({ nasabahId: await nasabahBaru("ani"), status: "lunas", tanggal: awalIni });
      await pinjaman({ nasabahId: await nasabahBaru("budi"), status: "lunas", tanggal: awalLalu });
      await pinjaman({ nasabahId: await nasabahBaru("citra"), status: "lunas", tanggal: awalLalu });
      await pinjaman({ nasabahId: await nasabahBaru("dewi"), status: "macet", tanggal: hari });

      const p = (await kirim("/lapangan/portofolio", { token: andi.tokenAkses }))
        .isi as unknown as {
        pembanding: {
          tanggalPotret: string;
          potret: { harian: Record<string, number> };
          bulanIni: { mulai: string; selesai: string; arus: { harian: Record<string, number> } };
          bulanLalu: { mulai: string; arus: { harian: Record<string, number> } };
        };
      };
      const pb = p.pembanding;
      expect(pb.tanggalPotret).toBe(akhirLalu);
      expect(pb.potret.harian).toEqual({
        jumlahBerjalan: 10,
        jumlahMacet: 1,
        saldoBerjalan: 5_000_000,
        saldoMacet: 300_000,
        angsuranBerjalan: 250_000,
        angsuranMacet: 25_000,
      });
      expect(pb.bulanIni).toMatchObject({ mulai: awalIni, selesai: hari });
      expect(pb.bulanLalu.mulai).toBe(awalLalu);
      expect(pb.bulanIni.arus.harian).toMatchObject({
        lunas: 1,
        pokokLunas: 1_000_000,
        macetBaru: 1,
      });
      expect(pb.bulanLalu.arus.harian).toMatchObject({
        lunas: 2,
        pokokLunas: 2_000_000,
        macetBaru: 0,
      });
    });
  }, 60_000);
});
