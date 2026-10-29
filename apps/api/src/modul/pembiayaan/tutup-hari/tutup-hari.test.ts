import { describe, expect, test } from "bun:test";
import { sql } from "drizzle-orm";
import { dalamTransaksi, siapkanKantor, URL_DB } from "../../../uji/bantu";
import { buatLayananTutupHari } from "./layanan";

/**
 * Tutup hari 20 Okt 2026 (Selasa) — jendela macet 21 Sep … 20 Okt, pekan
 * kerja Senin–Sabtu sejak 1 Jan. Semua di SATU transaksi yang dibatalkan.
 */
describe.skipIf(!URL_DB)("tutup hari", () => {
  test("macet, pulih, pagar pinjaman muda, tempoan, potret per pemegang, sekali saja", async () => {
    await dalamTransaksi(async (tx) => {
      const { bos, kolektor: andi, kantorId } = await siapkanKantor(tx);
      const andiId = andi.pengguna.id;
      const baris = async <T>(q: ReturnType<typeof sql>) => (await tx.execute(q)) as unknown as T[];

      // Pekan kerja lampau & kolektor kedua (salinan migrasi: jalan pintas).
      await tx.execute(sql`select set_config('nael.migrasi_data', 'ya', true)`);
      await tx.execute(sql`
        insert into pekan_kerja (kantor_id, berlaku_mulai, hari_kerja, dibuat_oleh)
        values (${kantorId}, '2026-01-01', 126, ${bos.pengguna.id})`);
      await tx.execute(sql`select set_config('nael.migrasi_data', '', true)`);
      const [dedi] = await baris<{ id: string }>(sql`
        insert into pengguna (kantor_id, peran, nama) values (${kantorId}, 'kolektor', 'Dedi') returning id`);
      const [w] = await baris<{ id: string }>(sql`
        insert into wilayah (kantor_id, nama, dibuat_oleh) values (${kantorId}, 'Pule', ${andiId}) returning id`);

      const pinjamanLama = async (isi: {
        nama: string;
        pemegang?: string;
        jenis?: string;
        tenor?: number;
        angsuran?: number;
        tanggalAkad?: string;
        tanggalDisalin?: string;
        status?: string;
        tanggalMacet?: string | null;
      }) => {
        const pemegang = isi.pemegang ?? andiId;
        const [n] = await baris<{ id: string }>(sql`
          insert into nasabah (kantor_id, kolektor_id, nama, wilayah_id)
          values (${kantorId}, ${pemegang}, ${isi.nama}, ${w?.id}) returning id`);
        const angsuran = isi.angsuran ?? 50_000;
        const tenor = isi.tenor ?? 24;
        const saldo = isi.jenis === "tempoan" ? angsuran : 1_000_000;
        const [p] = await baris<{ id: string }>(sql`
          insert into pinjaman (kantor_id, pencair_id, dibuat_oleh, nasabah_id, pinjaman_ke, jenis, tenor,
            asal, tanggal_akad, tanggal_disalin, pokok, potongan_admin, tabungan_masuk, pencairan,
            total_kembali, angsuran, saldo_awal, drop_baru, saldo, status, tanggal_macet)
          values (${kantorId}, ${pemegang}, ${bos.pengguna.id}, ${n?.id}, 1, ${isi.jenis ?? "harian"},
            ${tenor}, 'migrasi', ${isi.tanggalAkad ?? "2026-08-01"}, ${isi.tanggalDisalin ?? "2026-09-01"},
            1000000, 0, 0, 0, ${isi.jenis === "tempoan" ? angsuran : 1_200_000}, ${angsuran},
            ${saldo}, 0, ${saldo}, ${isi.status ?? "berjalan"}, ${isi.tanggalMacet ?? null})
          returning id`);
        return p?.id as string;
      };
      const setor = async (pinjamanId: string, tanggal: string, murni: number, pencatat = andiId) =>
        tx.execute(sql`
          insert into transaksi (kantor_id, pencatat_id, pinjaman_id, tanggal, jenis, setoran_murni, saldo_sesudah)
          values (${kantorId}, ${pencatat}, ${pinjamanId}, ${tanggal}, 'angsuran', ${murni}, 900000)`);

      // A: harian, 200.000 dalam jendela (500.000 tgl 15 Sep di luar jendela) → macet.
      const pA = await pinjamanLama({ nama: "A" });
      await setor(pA, "2026-09-15", 500_000);
      for (const t of ["2026-10-01", "2026-10-02", "2026-10-03", "2026-10-05"]) {
        await setor(pA, t, 50_000);
      }
      // B: harian macet sejak 10 Okt, 300.000 dalam jendela → pulih.
      const pB = await pinjamanLama({ nama: "B", status: "macet", tanggalMacet: "2026-10-10" });
      for (const t of ["2026-10-12", "2026-10-13", "2026-10-14", "2026-10-15", "2026-10-16"]) {
        await setor(pB, t, 60_000);
      }
      // C: harian baru disalin 10 Okt — 9 hari tagih (< 15) → belum dinilai.
      const pC = await pinjamanLama({ nama: "C", tanggalDisalin: "2026-10-10" });
      // D: tempoan akad 20 Sep tenor 14 → jatuh tempo 4 Okt, lewat 7 hari → macet.
      const pD = await pinjamanLama({
        nama: "D",
        jenis: "tempoan",
        tenor: 14,
        angsuran: 1_250_000,
        tanggalAkad: "2026-09-20",
        tanggalDisalin: "2026-09-20",
      });
      // E: mingguan dipegang Dedi, satu angsuran (120.000) dalam jendela → tetap berjalan.
      const pE = await pinjamanLama({
        nama: "E",
        pemegang: dedi?.id,
        jenis: "mingguan",
        tenor: 10,
        angsuran: 120_000,
      });
      await setor(pE, "2026-10-06", 120_000, dedi?.id);

      const layanan = buatLayananTutupHari({ db: tx });
      const hasil = await layanan.tutupHari(kantorId, "2026-10-20");
      expect(hasil).toEqual({ kantorId, tanggal: "2026-10-20", keMacet: 2, pulih: 1, potret: 3 });

      const status = await baris<{ id: string; status: string; tanggal_macet: string | null }>(sql`
        select id, status, tanggal_macet::text from pinjaman where kantor_id = ${kantorId}`);
      const dari = (id: string) => status.find((s) => s.id === id);
      expect(dari(pA)).toMatchObject({ status: "macet", tanggal_macet: "2026-10-20" });
      expect(dari(pB)).toMatchObject({ status: "berjalan", tanggal_macet: null });
      expect(dari(pC)?.status).toBe("berjalan");
      expect(dari(pD)).toMatchObject({ status: "macet", tanggal_macet: "2026-10-20" });
      expect(dari(pE)?.status).toBe("berjalan");
      // Pulih tercatat di riwayat status dengan tanggal hari yang ditutup.
      const riwayat = await baris<{ j: string }>(sql`
        select status_sebelum || '>' || status_sesudah || '@' || tanggal as j
        from riwayat_status_pinjaman where pinjaman_id = ${pB} and status_sebelum is not null`);
      // (Salinan yang lahir macet tercatat berjalan → macet pada tanggal_macet-nya.)
      expect(riwayat.map((r) => r.j).sort()).toEqual([
        "berjalan>macet@2026-10-10",
        "macet>berjalan@2026-10-20",
      ]);

      const potret = await baris<Record<string, unknown>>(sql`
        select kolektor_id, jenis, jumlah_berjalan, jumlah_macet, saldo_berjalan::int, saldo_macet::int,
               angsuran_berjalan::int, angsuran_macet::int
        from posisi_harian where kantor_id = ${kantorId} and tanggal = '2026-10-20'
        order by jenis`);
      expect(potret).toEqual([
        {
          kolektor_id: andiId,
          jenis: "harian",
          jumlah_berjalan: 2,
          jumlah_macet: 1,
          saldo_berjalan: 2_000_000,
          saldo_macet: 1_000_000,
          angsuran_berjalan: 100_000,
          angsuran_macet: 50_000,
        },
        {
          kolektor_id: dedi?.id,
          jenis: "mingguan",
          jumlah_berjalan: 1,
          jumlah_macet: 0,
          saldo_berjalan: 1_000_000,
          saldo_macet: 0,
          angsuran_berjalan: 120_000,
          angsuran_macet: 0,
        },
        {
          kolektor_id: andiId,
          jenis: "tempoan",
          jumlah_berjalan: 0,
          jumlah_macet: 1,
          saldo_berjalan: 0,
          saldo_macet: 1_250_000,
          angsuran_berjalan: 0,
          angsuran_macet: 1_250_000,
        },
      ]);

      // Sekali saja, tidak mundur.
      expect(await layanan.tutupHari(kantorId, "2026-10-20")).toBeNull();
      expect(await layanan.tutupHari(kantorId, "2026-10-19")).toBeNull();
      const [k] = await baris<{ t: string }>(sql`
        select tanggal_tutup_terakhir::text as t from kantor where id = ${kantorId}`);
      expect(k?.t).toBe("2026-10-20");
    });
  }, 60_000);
});
