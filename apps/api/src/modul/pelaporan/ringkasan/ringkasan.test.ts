import { describe, expect, test } from "bun:test";
import type { Sesi } from "@opennael/contracts";
import { geserTanggal } from "@opennael/domain";
import { sql } from "drizzle-orm";
import type { Db } from "../../../platform/db/klien";
import { dalamTransaksi, siapkanKantor, URL_DB } from "../../../uji/bantu";

/** Pembantu data uji: pinjaman langsung lewat SQL (tanggal bebas). */
function pembuat(tx: Db, kantorId: string, bosId: string) {
  const baris = async <T>(q: ReturnType<typeof sql>) => (await tx.execute(q)) as unknown as T[];
  let nomorFoto = 0;
  let wilayahId: string | undefined;
  return {
    baris,
    async nasabah(kolektorId: string, nama: string, isi: { nik?: string; kampung?: string } = {}) {
      const kampung = isi.kampung ?? "pule";
      const [w] = await baris<{ id: string }>(sql`
        insert into wilayah (kantor_id, nama, dibuat_oleh) values (${kantorId}, ${kampung}, ${kolektorId})
        on conflict (kantor_id, kunci) do update set nama = excluded.nama returning id`);
      wilayahId = w?.id;
      const [n] = await baris<{ id: string }>(sql`
        insert into nasabah (kantor_id, kolektor_id, nama, wilayah_id, nik)
        values (${kantorId}, ${kolektorId}, ${nama}, ${wilayahId}, ${isi.nik ?? null}) returning id`);
      return n?.id as string;
    },
    /** Pinjaman harian; `baru` = akad sungguhan bertanggal (berfoto), selain itu salinan migrasi. */
    async pinjaman(
      kolektorId: string,
      nasabahId: string,
      isi: {
        baru?: string;
        pokok?: number;
        saldo?: number;
        status?: string;
        tanggalSelesai?: string;
        tanggalMacet?: string;
      } = {},
    ) {
      const pokok = isi.pokok ?? 1_000_000;
      const total = pokok * 1.2;
      const saldo = isi.saldo ?? (isi.status === "lunas" ? 0 : total);
      let foto: string | null = null;
      if (isi.baru) {
        const [f] = await baris<{ id: string }>(sql`
          insert into foto (kantor_id, jenis, kunci_berkas, sha256, ukuran_byte, tipe_mime, diunggah_oleh)
          values (${kantorId}, 'serah_terima', 'f', ${String(++nomorFoto).padStart(64, "e")}, 1000,
                  'image/webp', ${kolektorId}) returning id`);
        foto = f?.id ?? null;
      }
      const [p] = await baris<{ id: string }>(sql`
        insert into pinjaman (kantor_id, pencair_id, dibuat_oleh, nasabah_id, pinjaman_ke, jenis, tenor,
          asal, tanggal_akad, tanggal_disalin, foto_serah_terima_id, pokok, potongan_admin, tabungan_masuk,
          pencairan, total_kembali, angsuran, saldo_awal, drop_baru, saldo, status, tanggal_selesai, tanggal_macet)
        values (${kantorId}, ${kolektorId}, ${bosId}, ${nasabahId}, 1, 'harian', 24,
          ${isi.baru ? "baru" : "migrasi"}, ${isi.baru ?? "2026-08-01"}, ${isi.baru ? null : "2026-09-01"}, ${foto},
          ${pokok}, ${isi.baru ? pokok * 0.05 : 0}, ${isi.baru ? pokok * 0.05 : 0}, ${isi.baru ? pokok * 0.9 : 0},
          ${total}, ${total / 24}, ${total}, ${isi.baru ? pokok : 0}, ${saldo}, ${isi.status ?? "berjalan"},
          ${isi.tanggalSelesai ?? null}, ${isi.tanggalMacet ?? null})
        returning id`);
      return p?.id as string;
    },
    async setor(
      kolektorId: string,
      pinjamanId: string,
      tanggal: string,
      isi: { murni?: number; pelunasan?: number; tabunganKeluar?: number; jenis?: string },
    ) {
      await tx.execute(sql`
        insert into transaksi (kantor_id, pencatat_id, pinjaman_id, tanggal, jenis, setoran_murni,
          setoran_pelunasan, tabungan_keluar, saldo_sesudah)
        values (${kantorId}, ${kolektorId}, ${pinjamanId}, ${tanggal}, ${isi.jenis ?? "angsuran"},
          ${isi.murni ?? 0}, ${isi.pelunasan ?? 0}, ${isi.tabunganKeluar ?? 0},
          ${isi.jenis === "pelunasan" ? 0 : 100_000})`);
    },
  };
}

describe.skipIf(!URL_DB)("ringkasan & layar baca bos", () => {
  test("ringkasan, per kolektor, performa (contoh N), posisi modal", async () => {
    await dalamTransaksi(async (tx) => {
      const { kirim, bos, kolektor: andi, kantorId } = await siapkanKantor(tx);
      const b = bos.tokenAkses;
      const andiId = andi.pengguna.id;
      const kode = (r: { isi: Record<string, unknown> }) => r.isi.kode;
      const tautkan = async (peran: "kolektor" | "pengawas", nama: string) => {
        const t = await kirim("/auth/tautan", { isi: {} });
        await kirim("/auth/tautan/setujui", {
          isi: { kode: t.isi.kode, akun: { peran, nama } },
          token: b,
        });
        return (await kirim(`/auth/tautan/${t.isi.id}/klaim`, { isi: { klaim: t.isi.klaim } }))
          .isi as Sesi;
      };
      const dedi = await tautkan("kolektor", "dedi");
      const pengawas = await tautkan("pengawas", "wawan");
      const d = pembuat(tx, kantorId, bos.pengguna.id);
      const [h] = await d.baris<{ t: string }>(sql`select kantor_hari_ini(${kantorId})::text as t`);
      const hari = h?.t as string;
      const kemarin = geserTanggal(hari, -1);

      // ---- data: contoh aturan-usaha N untuk Andi ----------------------------------
      // Potret kemarin: angsuran berjalan harian 2.000.000 (saldo 10.000.000).
      await tx.execute(sql`
        insert into posisi_harian (kantor_id, kolektor_id, tanggal, jenis, jumlah_berjalan, saldo_berjalan, angsuran_berjalan)
        values (${kantorId}, ${andiId}, ${kemarin}, 'harian', 40, 10000000, 2000000)`);
      // Hari ini dua pinjaman harian berangsuran 50.000 lunas → mati 100.000.
      for (const nama of ["lunas 1", "lunas 2"]) {
        await d.pinjaman(andiId, await d.nasabah(andiId, nama), {
          status: "lunas",
          tanggalSelesai: hari,
        });
      }
      // Setoran murni harian hari ini 1.710.000 (pinjaman pokok 10 jt, saldo 12 jt).
      const pBesar = await d.pinjaman(andiId, await d.nasabah(andiId, "budi"), {
        pokok: 10_000_000,
      });
      await d.setor(andiId, pBesar, hari, { murni: 1_710_000 });
      // Dedi: setoran 100.000 pada pinjaman yang macet.
      const pDedi = await d.pinjaman(dedi.pengguna.id, await d.nasabah(dedi.pengguna.id, "tono"), {
        status: "macet",
        tanggalMacet: "2026-10-01",
      });
      await d.setor(dedi.pengguna.id, pDedi, hari, { murni: 100_000 });
      // Akad baru Andi hari ini: pokok 1 jt → admin & tabungan 50 rb, cair 900 rb.
      await d.pinjaman(andiId, await d.nasabah(andiId, "rina"), { baru: hari });
      // Hari Andi: kas 1 jt + uang jalan 50 rb; diterima 1.980.000 dari 2.000.000 → tekor 20 rb.
      await tx.execute(sql`select set_config('nael.migrasi_data', 'ya', true)`);
      const [hk] = await d.baris<{ id: string }>(sql`
        insert into hari_kolektor (kantor_id, kolektor_id, tanggal, absensi, kas_lapangan, uang_jalan, laporan_dibuka_at)
        values (${kantorId}, ${andiId}, ${hari}, 'masuk_kerja', 1000000, 50000, now()) returning id`);
      await tx.execute(sql`
        insert into serah_terima_kas (kantor_id, hari_kolektor_id, tunai_seharusnya, tunai_diterima, diterima_oleh)
        values (${kantorId}, ${hk?.id}, 2000000, 1980000, ${bos.pengguna.id})`);
      await tx.execute(sql`select set_config('nael.migrasi_data', '', true)`);

      // ---- ringkasan ----------------------------------------------------------------
      const kantor = (await kirim("/ringkasan", { token: b })).isi;
      expect(kantor.penagihan).toMatchObject({
        jumlahSetoran: 2,
        setoranMurni: 1_810_000,
        storting: 1_810_000,
      });
      expect(kantor.akad).toMatchObject({
        jumlahAkad: 1,
        droping: 1_000_000,
        potonganAdmin: 50_000,
        pencairan: 900_000,
      });
      expect(kantor.kasLapangan).toMatchObject({
        hariKerja: 1,
        kasLapangan: 1_000_000,
        uangJalan: 50_000,
        tunaiDiterima: 1_980_000,
        tekor: 20_000,
        lebihSetor: 0,
      });
      const milikAndi = (await kirim("/ringkasan", { token: andi.tokenAkses })).isi;
      expect(milikAndi.penagihan.storting).toBe(1_710_000);
      expect(
        kode(await kirim(`/ringkasan?kolektorId=${dedi.pengguna.id}`, { token: andi.tokenAkses })),
      ).toBe("BUKAN_MILIK_ANDA");
      const per = (await kirim("/ringkasan/per-kolektor", { token: pengawas.tokenAkses })).isi;
      expect(
        per.map((r: { kolektor: { nama: string }; penagihan: { storting: number } }) => [
          r.kolektor.nama,
          r.penagihan.storting,
        ]),
      ).toEqual([
        ["andi", 1_710_000],
        ["dedi", 100_000],
      ]);
      expect(kode(await kirim("/ringkasan/per-kolektor", { token: andi.tokenAkses }))).toBe(
        "PERAN_DILARANG",
      );

      // ---- performa: contoh N → 90% ------------------------------------------------------
      const deret = (
        await kirim(`/ringkasan/performa?mulai=${kemarin}&selesai=${hari}&kolektorId=${andiId}`, {
          token: b,
        })
      ).isi;
      expect(deret).toEqual([
        { tanggal: kemarin, setoranMurni: 0, patokan: null, persentase: null },
        { tanggal: hari, setoranMurni: 1_710_000, patokan: 1_900_000, persentase: 90 },
      ]);
      expect(
        kode(await kirim(`/ringkasan/performa?mulai=2025-01-01&selesai=${hari}`, { token: b })),
      ).toBe("RENTANG_TERLALU_PANJANG");

      // ---- posisi modal (bos saja) ---------------------------------------------------------
      await kirim("/kas/buka", { isi: { tunai: 5_000_000, bank: 1_000_000 }, token: b });
      expect(kode(await kirim("/kas/posisi-modal", { token: pengawas.tokenAkses }))).toBe(
        "PERAN_DILARANG",
      );
      // Tunai 5 jt + (1.980.000 − 1 jt − 50 rb) = 5.930.000; piutang berjalan = 12 jt (Budi) + 1,2 jt (Rina);
      // macet = 1,2 jt (Dedi); tabungan = 50 rb (akad Rina).
      expect((await kirim("/kas/posisi-modal", { token: b })).isi).toEqual({
        tanggal: hari,
        saldoTunai: 5_930_000,
        kasDiLapangan: 0,
        diBrankas: 5_930_000,
        saldoBank: 1_000_000,
        piutangBerjalan: 13_200_000,
        piutangMacet: 1_200_000,
        tabunganNasabah: 50_000,
        posisiModal: 5_930_000 + 1_000_000 + 13_200_000 + 1_200_000 - 50_000,
      });
      // Kemarin: piutang dari potret; kas di lapangan hanya untuk hari ini.
      expect((await kirim(`/kas/posisi-modal?tanggal=${kemarin}`, { token: b })).isi).toMatchObject(
        {
          piutangBerjalan: 10_000_000,
          piutangMacet: 0,
          kasDiLapangan: null,
          tabunganNasabah: 0,
          posisiModal: 5_000_000 + 1_000_000 + 10_000_000,
        },
      );
      // Tanpa potret → tak bisa dihitung.
      expect(
        (await kirim(`/kas/posisi-modal?tanggal=${geserTanggal(hari, -2)}`, { token: b })).isi
          .posisiModal,
      ).toBeNull();
      expect(
        kode(await kirim(`/kas/posisi-modal?tanggal=${geserTanggal(hari, 1)}`, { token: b })),
      ).toBe("TANGGAL_DEPAN");
    });
  }, 60_000);

  test("performa mingguan, tempoan, dan semua jenis (aturan-usaha N3, N4)", async () => {
    await dalamTransaksi(async (tx) => {
      const { kirim, bos, kolektor: andi, kantorId } = await siapkanKantor(tx);
      const b = bos.tokenAkses;
      const k = andi.tokenAkses;
      const andiId = andi.pengguna.id;
      const kode = (r: { isi: Record<string, unknown> }) => r.isi.kode;
      const t = await kirim("/auth/tautan", { isi: {} });
      await kirim("/auth/tautan/setujui", {
        isi: { kode: t.isi.kode, akun: { peran: "kolektor", nama: "dedi" } },
        token: b,
      });
      const dedi = (await kirim(`/auth/tautan/${t.isi.id}/klaim`, { isi: { klaim: t.isi.klaim } }))
        .isi as Sesi;
      const d = pembuat(tx, kantorId, bos.pengguna.id);
      const [h] = await d.baris<{ t: string }>(sql`select kantor_hari_ini(${kantorId})::text as t`);
      const hari = h?.t as string;
      const kemarin = geserTanggal(hari, -1);

      /** Pinjaman mingguan/tempoan berangsuran tertentu (salinan migrasi, riwayat status lewat trigger). */
      const jenisLain = async (
        kolektorId: string,
        nama: string,
        isi: {
          jenis: "mingguan" | "tempoan";
          akad: string;
          angsuran: number;
          status?: "berjalan" | "macet" | "lunas" | "digulung";
          tanggalMacet?: string;
          tanggalSelesai?: string;
        },
      ) => {
        const nasabahId = await d.nasabah(kolektorId, nama);
        const tenor = isi.jenis === "mingguan" ? 8 : 14;
        const selesai = isi.status === "lunas" || isi.status === "digulung";
        const total = isi.jenis === "mingguan" ? isi.angsuran * tenor : isi.angsuran;
        const [p] = await d.baris<{ id: string }>(sql`
          insert into pinjaman (kantor_id, pencair_id, dibuat_oleh, nasabah_id, pinjaman_ke, jenis, tenor,
            asal, tanggal_akad, tanggal_disalin, pokok, potongan_admin, tabungan_masuk, pencairan,
            total_kembali, angsuran, saldo_awal, drop_baru, saldo, status, tanggal_macet, tanggal_selesai)
          values (${kantorId}, ${kolektorId}, ${bos.pengguna.id}, ${nasabahId}, 1, ${isi.jenis}, ${tenor},
            'migrasi', ${isi.akad}, ${isi.akad}, 100000, 0, 0, 0, ${total}, ${isi.angsuran}, ${total}, 0,
            ${selesai ? 0 : total}, ${isi.status ?? "berjalan"}, ${isi.tanggalMacet ?? null},
            ${selesai ? (isi.tanggalSelesai ?? hari) : null})
          returning id`);
        return p?.id as string;
      };

      // ---- mingguan: contoh N3 — empat pinjaman jatuh tagih hari ini (akad 14 hari lalu) ----
      const akad = geserTanggal(hari, -14);
      const pA = await jenisLain(andiId, "a", { jenis: "mingguan", akad, angsuran: 150_000 });
      const pB = await jenisLain(andiId, "b", { jenis: "mingguan", akad, angsuran: 125_000 });
      await jenisLain(andiId, "c", {
        jenis: "mingguan",
        akad,
        angsuran: 100_000,
        status: "macet",
        tanggalMacet: geserTanggal(hari, -7),
      });
      await jenisLain(andiId, "d", {
        jenis: "mingguan",
        akad,
        angsuran: 200_000,
        status: "digulung",
        tanggalSelesai: hari,
      });
      // Bukan hari tagihnya (akad 13 hari lalu), dan milik kolektor lain.
      await jenisLain(andiId, "e", {
        jenis: "mingguan",
        akad: geserTanggal(hari, -13),
        angsuran: 500_000,
      });
      await jenisLain(dedi.pengguna.id, "f", { jenis: "mingguan", akad, angsuran: 50_000 });
      await d.setor(andiId, pA, hari, { murni: 150_000 });
      await d.setor(andiId, pB, hari, { murni: 70_000 });

      // ---- tempoan: jatuh tempo hari ini; satu lunas hari ini (membayar), satu macet kemarin ----
      const akadTempo = geserTanggal(hari, -14);
      const pT = await jenisLain(andiId, "t1", {
        jenis: "tempoan",
        akad: akadTempo,
        angsuran: 1_250_000,
        status: "lunas",
        tanggalSelesai: hari,
      });
      await jenisLain(andiId, "t2", {
        jenis: "tempoan",
        akad: akadTempo,
        angsuran: 900_000,
        status: "macet",
        tanggalMacet: geserTanggal(hari, -3),
      });
      await d.setor(andiId, pT, hari, { murni: 1_250_000 });

      // ---- harian: potret kemarin 2.000.000, setoran murni 1.000.000 ----
      await tx.execute(sql`
        insert into posisi_harian (kantor_id, kolektor_id, tanggal, jenis, jumlah_berjalan, saldo_berjalan, angsuran_berjalan)
        values (${kantorId}, ${andiId}, ${kemarin}, 'harian', 40, 10000000, 2000000)`);
      const pH = await d.pinjaman(andiId, await d.nasabah(andiId, "h"), { pokok: 10_000_000 });
      await d.setor(andiId, pH, hari, { murni: 1_000_000 });

      const baca = async (jenis: string, token = b, kolektorId = andiId) =>
        (
          await kirim(
            `/ringkasan/performa?mulai=${hari}&selesai=${hari}&kolektorId=${kolektorId}&jenis=${jenis}`,
            { token },
          )
        ).isi;

      // N3 mingguan: A + B berjalan = 275.000 (C macet, D digulung hari ini, E bukan hari tagih).
      expect(await baca("mingguan")).toEqual([
        { tanggal: hari, setoranMurni: 220_000, patokan: 275_000, persentase: 80 },
      ]);
      // N3 tempoan: T1 lunas hari ini tetap masuk, T2 macet tidak → 1.250.000 / 1.250.000.
      expect(await baca("tempoan")).toEqual([
        { tanggal: hari, setoranMurni: 1_250_000, patokan: 1_250_000, persentase: 100 },
      ]);
      // N1 harian tak berubah; tanpa jenis = harian (kompatibel mundur untuk web).
      const harian = { tanggal: hari, setoranMurni: 1_000_000, patokan: 2_000_000, persentase: 50 };
      expect(await baca("harian")).toEqual([harian]);
      expect(
        (
          await kirim(`/ringkasan/performa?mulai=${hari}&selesai=${hari}&kolektorId=${andiId}`, {
            token: b,
          })
        ).isi,
      ).toEqual([harian]);
      // N4 semua: ketiganya dijumlah.
      const semua = (await baca("semua")) as {
        setoranMurni: number;
        patokan: number;
        persentase: number;
      }[];
      expect(semua).toHaveLength(1);
      expect(semua[0]).toMatchObject({
        tanggal: hari,
        setoranMurni: 2_470_000,
        patokan: 3_525_000,
      });
      expect(semua[0]?.persentase).toBeCloseTo((2_470_000 / 3_525_000) * 100, 6);

      // Kolektor membaca miliknya tanpa kolektorId; kantor (bos tanpa kolektorId) mencakup Dedi juga.
      expect(
        (
          await kirim(`/ringkasan/performa?mulai=${hari}&selesai=${hari}&jenis=mingguan`, {
            token: k,
          })
        ).isi,
      ).toEqual([{ tanggal: hari, setoranMurni: 220_000, patokan: 275_000, persentase: 80 }]);
      expect(
        (
          await kirim(`/ringkasan/performa?mulai=${hari}&selesai=${hari}&jenis=mingguan`, {
            token: b,
          })
        ).isi,
      ).toEqual([
        {
          tanggal: hari,
          setoranMurni: 220_000,
          patokan: 325_000,
          persentase: (220_000 / 325_000) * 100,
        },
      ]);
      // Hari lain tanpa yang jatuh tagih: patokan 0, persentase kosong (bukan nol).
      expect(
        (
          await kirim(
            `/ringkasan/performa?mulai=${kemarin}&selesai=${kemarin}&kolektorId=${andiId}&jenis=mingguan`,
            { token: b },
          )
        ).isi,
      ).toEqual([{ tanggal: kemarin, setoranMurni: 0, patokan: 0, persentase: null }]);
      // Jenis tak dikenal ditolak.
      expect(
        (
          await kirim(`/ringkasan/performa?mulai=${hari}&selesai=${hari}&jenis=bulanan`, {
            token: b,
          })
        ).status,
      ).toBe(400);
      expect(kode(await kirim(`/ringkasan/performa?jenis=mingguan`))).toBe("BELUM_MASUK");
    });
  }, 60_000);

  test("nasabah serupa & neraca nasabah", async () => {
    await dalamTransaksi(async (tx) => {
      const { kirim, bos, kolektor: andi, kantorId } = await siapkanKantor(tx);
      const b = bos.tokenAkses;
      const andiId = andi.pengguna.id;
      const kode = (r: { isi: Record<string, unknown> }) => r.isi.kode;
      const d = pembuat(tx, kantorId, bos.pengguna.id);

      // ---- serupa --------------------------------------------------------------------
      const nSari = await d.nasabah(andiId, "sari wulandari", {
        nik: "3201234567890001",
        kampung: "pule",
      });
      await d.nasabah(andiId, "sari dewi", { kampung: "sawah" });
      const lewatNama = (
        await kirim("/nasabah/serupa?nama=sari&kampung=PULE", { token: andi.tokenAkses })
      ).isi;
      expect(lewatNama).toEqual([
        expect.objectContaining({ id: nSari, cocok: "nama", kampung: "pule", diblokir: false }),
      ]);
      expect((await kirim("/nasabah/serupa?nama=sari", { token: b })).isi).toHaveLength(2);
      const lewatNik = (await kirim("/nasabah/serupa?nama=zzz&nik=3201234567890001", { token: b }))
        .isi;
      expect(lewatNik).toEqual([expect.objectContaining({ id: nSari, cocok: "nik" })]);

      // ---- neraca --------------------------------------------------------------------
      // Akad 1 Sep cair 900 rb; angsuran 50 rb + uang lebih 10 rb; lunas: tabungan 500 rb
      // menutup 300 rb, sisanya 200 rb diserahkan tunai (D2).
      const p = await d.pinjaman(andiId, nSari, {
        baru: "2026-09-01",
        status: "lunas",
        tanggalSelesai: "2026-09-20",
      });
      await d.setor(andiId, p, "2026-09-02", { murni: 50_000, pelunasan: 10_000 });
      await d.setor(andiId, p, "2026-09-20", {
        jenis: "pelunasan",
        pelunasan: 300_000,
        tabunganKeluar: 500_000,
      });
      expect(kode(await kirim(`/nasabah/${nSari}/neraca`, { token: andi.tokenAkses }))).toBe(
        "PERAN_DILARANG",
      );
      expect((await kirim(`/nasabah/${nSari}/neraca`, { token: b })).isi).toEqual({
        nasabah: { id: nSari, nama: "sari wulandari" },
        jumlahPinjaman: 1,
        totalPencairan: 900_000,
        tabunganDikembalikan: 200_000,
        totalSetoran: 60_000,
        arusKas: 60_000 - 900_000 - 200_000,
        tabungan: 0,
        piutangAktif: 0,
        piutangDiputihkan: 0,
        neraca: 0,
      });
    });
  }, 60_000);
});
