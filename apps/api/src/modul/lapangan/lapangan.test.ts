import { describe, expect, test } from "bun:test";
import type { Sesi } from "@opennael/contracts";
import { sql, TransactionRollbackError } from "drizzle-orm";
import { buatApp } from "../../app";
import { buatDb, type Db } from "../../db/klien";
import { pastikanDatabasePengembangan } from "../../db/penjaga";

/**
 * Operasi lapangan kolektor, ujung ke ujung (HTTP → layanan → database), di
 * SATU transaksi yang dibatalkan. Angka mengikuti docs/aturan-usaha.md.
 */
const url = process.env.DATABASE_URL;
const KODE_REG = "kode-registrasi-uji-cukup-panjang";
const RAHASIA = { jwtRahasia: "j".repeat(40), sesiRahasia: "s".repeat(40) };

async function dalamTransaksi(uji: (tx: Db) => Promise<void>) {
  pastikanDatabasePengembangan(url);
  const { db, sql: klien } = buatDb(url as string);
  try {
    await db.transaction(async (tx) => {
      await uji(tx);
      tx.rollback();
    });
  } catch (e) {
    if (!(e instanceof TransactionRollbackError)) throw e;
  } finally {
    await klien.end();
  }
}

function pengirim(app: ReturnType<typeof buatApp>) {
  return async (jalur: string, isi?: unknown, token?: string) => {
    const res = await app.request(jalur, {
      method: isi === undefined && !jalur.endsWith("/laporan") ? "GET" : "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(isi === undefined ? {} : { body: JSON.stringify(isi) }),
    });
    const teks = await res.text();
    // biome-ignore lint/suspicious/noExplicitAny: isi jawaban di uji dibaca bebas lalu diperiksa expect
    return { status: res.status, isi: (teks ? JSON.parse(teks) : null) as Record<string, any> };
  };
}

describe.skipIf(!url)("lapangan kolektor", () => {
  test("absen, akad, bayar, lunas, gulung, libur, laporan — dan semua gerbangnya", async () => {
    await dalamTransaksi(async (tx) => {
      const kirim = pengirim(buatApp({ db: tx, ...RAHASIA, kodeRegistrasi: KODE_REG }));
      const bos = (
        await kirim("/auth/register", {
          kodeRegistrasi: KODE_REG,
          namaKantor: "Kantor Lapangan",
          nama: "Bos",
          nomorHp: "081299990010",
          sandi: "sandi-rahasia-uji",
        })
      ).isi as Sesi;
      const kantorId = bos.pengguna.kantor.id;
      // Uji berjalan jam berapa pun & hari apa pun: buka 00:00, kerja tiap hari.
      await tx.execute(sql`update kantor set jam_buka = '00:00' where id = ${kantorId}`);
      await tx.execute(sql`update pekan_kerja set hari_kerja = 127 where kantor_id = ${kantorId}`);

      // HP kolektor ditautkan bos.
      const t = await kirim("/auth/tautan", {});
      await kirim(
        "/auth/tautan/setujui",
        { kode: t.isi.kode, akun: { peran: "kolektor", nama: "Andi" } },
        bos.tokenAkses,
      );
      const andi = (await kirim(`/auth/tautan/${t.isi.id}/klaim`, { klaim: t.isi.klaim }))
        .isi as Sesi;
      const k = andi.tokenAkses;
      const kode = (r: { isi: Record<string, unknown> }) => r.isi.kode;

      let nomorFoto = 0;
      const fotoBaru = async (oleh = andi.pengguna.id, umurMenit = 0) => {
        const r = await tx.execute(sql`
          insert into foto (kantor_id, jenis, kunci_berkas, sha256, ukuran_byte, tipe_mime, diunggah_oleh, dibuat_at)
          values (${kantorId}, 'serah_terima', 'f', ${String(++nomorFoto).padStart(64, "0")}, 1000, 'image/webp',
                  ${oleh}, now() - make_interval(mins => ${umurMenit}))
          returning id`);
        return (r as unknown as { id: string }[])[0]?.id as string;
      };
      const akadBaru = async (nama: string, isi: Record<string, unknown> = {}) =>
        kirim(
          "/lapangan/akad",
          {
            nasabah: { nama, kampung: { nama: " Pule  Barat " } },
            jenis: "harian",
            pokok: 1_000_000,
            tenor: 24,
            fotoSerahTerimaId: await fotoBaru(),
            ...isi,
          },
          k,
        );

      // ---- gerbang: peran & absen -------------------------------------------
      expect(kode(await kirim("/lapangan/pinjaman", undefined, bos.tokenAkses))).toBe(
        "PERAN_DILARANG",
      );
      expect(kode(await akadBaru("Sari"))).toBe("BELUM_ABSEN");
      const absen = await kirim(
        "/lapangan/absen",
        { absensi: "masuk_kerja", kasLapangan: 1_000_000, uangJalan: 50_000 },
        k,
      );
      expect(absen.status).toBe(201);
      expect(absen.isi).toMatchObject({
        absensi: "masuk_kerja",
        kasLapangan: 1_000_000,
        laporanDibukaAt: null,
      });
      expect(
        kode(await kirim("/lapangan/absen", { absensi: "tidak_kerja", alasan: "sakit" }, k)),
      ).toBe("SUDAH_ABSEN");

      // ---- akad (A) ------------------------------------------------------------
      const sari = await akadBaru("Sari", {
        nasabah: { nama: "Sari", kampung: { nama: " Pule  Barat " }, nik: "3201010101010001" },
      });
      expect(sari.status).toBe(201);
      expect(sari.isi).toMatchObject({
        pinjamanKe: 1,
        pokok: 1_000_000,
        potonganAdmin: 50_000,
        tabunganMasuk: 50_000,
        pencairan: 900_000,
        saldo: 1_200_000,
        angsuran: 50_000,
        angsuranKe: 0,
        nasabah: { nama: "Sari", kampung: "Pule Barat" },
      });
      expect(
        kode(
          await akadBaru("Sari Lain", {
            nasabah: {
              nama: "Sari Lain",
              kampung: { nama: "Pule Barat" },
              nik: "3201010101010001",
            },
          }),
        ),
      ).toBe("NIK_SUDAH_TERDAFTAR");
      expect(
        kode(
          await akadBaru("X", {
            fotoSerahTerimaId: sari.isi.fotoSerahTerimaId ?? (await fotoBaru()),
            pokok: 150_000,
          }),
        ),
      ).toBe("POKOK_TIDAK_SAH");
      expect(
        kode(await akadBaru("X", { fotoSerahTerimaId: await fotoBaru(bos.pengguna.id) })),
      ).toBe("FOTO_BUKAN_MILIK_ANDA");
      expect(
        kode(await akadBaru("X", { fotoSerahTerimaId: await fotoBaru(andi.pengguna.id, 90) })),
      ).toBe("FOTO_KEDALUWARSA");
      // Nasabah lama yang masih berpinjaman tak bisa akad lagi.
      expect(
        kode(
          await kirim(
            "/lapangan/akad",
            {
              nasabah: { nasabahId: sari.isi.nasabah.id },
              jenis: "harian",
              pokok: 1_000_000,
              tenor: 24,
              fotoSerahTerimaId: await fotoBaru(),
            },
            k,
          ),
        ),
      ).toBe("PINJAMAN_MASIH_AKTIF");
      const [tab] = (await tx.execute(
        sql`select saldo_tabungan from nasabah where id = ${sari.isi.nasabah.id}`,
      )) as unknown as { saldo_tabungan: string }[];
      expect(Number(tab?.saldo_tabungan)).toBe(50_000);

      // ---- bayar (C) -----------------------------------------------------------
      const pSari = sari.isi.id as string;
      expect(
        kode(await kirim("/lapangan/bayar", { pinjamanId: pSari, setoranMurni: 52_000 }, k)),
      ).toBe("NOMINAL_SETORAN_TIDAK_SESUAI");
      const bayar = await kirim("/lapangan/bayar", { pinjamanId: pSari, setoranMurni: 50_000 }, k);
      expect(bayar.status).toBe(201);
      expect(bayar.isi).toMatchObject({
        jenis: "angsuran",
        storting: 50_000,
        saldoSesudah: 1_150_000,
      });
      expect(
        kode(await kirim("/lapangan/bayar", { pinjamanId: pSari, setoranMurni: 50_000 }, k)),
      ).toBe("PERISTIWA_SUDAH_ADA");
      expect(kode(await kirim("/lapangan/libur", { pinjamanId: pSari }, k))).toBe(
        "PERISTIWA_SUDAH_ADA",
      );

      // ---- lunas (D) -----------------------------------------------------------
      const budi = await akadBaru("Budi", { pokok: 500_000 });
      const lunas = await kirim("/lapangan/lunas", { pinjamanId: budi.isi.id }, k);
      expect(lunas.status).toBe(201);
      // Saldo 600.000, tabungan 25.000 → nasabah membayar 575.000.
      expect(lunas.isi).toMatchObject({
        jenis: "pelunasan",
        setoranMurni: 575_000,
        setoranPelunasan: 25_000,
        tabunganKeluar: 25_000,
        storting: 575_000,
        saldoSesudah: 0,
      });

      // ---- gulung (E) ----------------------------------------------------------
      const tono = await akadBaru("Tono");
      // Seolah 12 angsuran sudah terbayar: saldo 600.000.
      await tx.execute(sql`update pinjaman set saldo = 600000 where id = ${tono.isi.id}`);
      const gulung = (pokok: number, foto?: string) =>
        (async () =>
          kirim(
            "/lapangan/gulung",
            { pinjamanId: tono.isi.id, pokok, tenor: 24, fotoSerahTerimaId: foto ?? "" },
            k,
          ))();
      await tx.execute(sql`insert into kebijakan (kantor_id, gulung_pinjaman_dikunci, alasan_kunci, diubah_oleh)
                           values (${kantorId}, true, 'Akhir bulan', ${bos.pengguna.id})`);
      const dikunci = await gulung(1_000_000, await fotoBaru());
      expect(kode(dikunci)).toBe("GULUNG_PINJAMAN_DIKUNCI");
      expect(dikunci.isi.pesan).toContain("Akhir bulan");
      await tx.execute(sql`delete from kebijakan where kantor_id = ${kantorId}`);
      expect(kode(await gulung(1_500_000, await fotoBaru()))).toBe(
        "GULUNG_PERTAMA_TIDAK_BOLEH_NAIK",
      );
      const g = await gulung(1_000_000, await fotoBaru());
      expect(g.status).toBe(201);
      expect(g.isi.transaksi).toMatchObject({
        jenis: "gulung",
        setoranMurni: 0,
        setoranPelunasan: 600_000,
        saldoSesudah: 0,
      });
      expect(g.isi.pinjamanBaru).toMatchObject({
        asal: "gulung",
        pinjamanKe: 2,
        pencairan: 300_000,
        saldo: 1_200_000,
      });

      // ---- libur (G) -----------------------------------------------------------
      const penerus = g.isi.pinjamanBaru.id as string;
      expect(kode(await kirim("/lapangan/libur", { pinjamanId: penerus }, k))).toBe(
        "LIBUR_BELUM_BOLEH",
      );
      await tx.execute(sql`update pinjaman set saldo = 1100000 where id = ${penerus}`);
      const libur = await kirim("/lapangan/libur", { pinjamanId: penerus, alasan: "sakit" }, k);
      expect(libur.status).toBe(201);
      expect(
        kode(await kirim("/lapangan/bayar", { pinjamanId: penerus, setoranMurni: 50_000 }, k)),
      ).toBe("PERISTIWA_SUDAH_ADA");
      const wati = await akadBaru("Wati", { jenis: "tempoan", tenor: 14 });
      expect(kode(await kirim("/lapangan/libur", { pinjamanId: wati.isi.id }, k))).toBe(
        "LIBUR_TIDAK_BERLAKU",
      );

      // ---- rem pinjaman baru ---------------------------------------------------
      await tx.execute(sql`insert into kebijakan (kantor_id, kolektor_id, pinjaman_baru_dikunci, diubah_oleh)
                           values (${kantorId}, ${andi.pengguna.id}, true, ${bos.pengguna.id})`);
      expect(kode(await akadBaru("Dewi"))).toBe("PINJAMAN_BARU_DIKUNCI");

      // ---- daftar pegangan -----------------------------------------------------
      const daftar = await kirim("/lapangan/pinjaman", undefined, k);
      expect(daftar.isi.map((p: { nasabah: { nama: string } }) => p.nasabah.nama)).toEqual([
        "Sari",
        "Tono",
        "Wati",
      ]);
      // Catatan hari ini: Sari sudah setor, penerus Tono libur, Wati belum.
      expect(daftar.isi.map((p: { hariIni: unknown }) => p.hariIni)).toEqual([
        { jenis: "angsuran", storting: 50_000 },
        { jenis: "libur", alasan: "sakit" },
        null,
      ]);
      expect(daftar.isi[0].tabungan).toBe(50_000);
      // Budi sudah lunas → calon pinjam lagi; Tono masih punya pinjaman penerus.
      const lama = await kirim("/lapangan/nasabah-lama", undefined, k);
      expect(lama.isi).toEqual([
        {
          id: budi.isi.nasabah.id,
          nama: "Budi",
          kampung: "Pule Barat",
          tabungan: 0,
          terakhir: { pinjamanKe: 1, jenis: "harian", pokok: 500_000 },
        },
      ]);
      expect((await kirim("/lapangan/kampung", undefined, k)).isi).toEqual([
        { id: expect.any(String), nama: "Pule Barat" },
      ]);

      // ---- libur kantor & laporan menghentikan lapangan -----------------------
      const hariIni = await kirim("/lapangan/hari-ini", undefined, k);
      await tx.execute(sql`insert into libur_kantor (kantor_id, tanggal, alasan_libur, dibuat_oleh)
                           values (${kantorId}, ${hariIni.isi.kalender.tanggal}, 'Acara', ${bos.pengguna.id})`);
      expect(
        kode(await kirim("/lapangan/bayar", { pinjamanId: wati.isi.id, setoranMurni: 50_000 }, k)),
      ).toBe("LIBUR_KANTOR");
      await tx.execute(sql`select set_config('nael.hapus_data_uji', 'ya', true)`);
      await tx.execute(sql`delete from libur_kantor where kantor_id = ${kantorId}`);
      const laporan = await kirim("/lapangan/laporan", {}, k);
      expect(laporan.status).toBe(200);
      expect(laporan.isi.laporanDibukaAt).not.toBeNull();
      expect(
        kode(await kirim("/lapangan/bayar", { pinjamanId: pSari, setoranMurni: 50_000 }, k)),
      ).toBe("LAPORAN_SUDAH_DIBUKA");
    });
  }, 120_000);

  test("saklar VALIDASI_* mematikan pemeriksaan kalender gerbang satu per satu", async () => {
    await dalamTransaksi(async (tx) => {
      const app = (validasiKalender?: {
        jamKerja: boolean;
        hariKerja: boolean;
        liburKantor: boolean;
      }) => pengirim(buatApp({ db: tx, ...RAHASIA, kodeRegistrasi: KODE_REG, validasiKalender }));
      const ketat = app();
      const bos = (
        await ketat("/auth/register", {
          kodeRegistrasi: KODE_REG,
          namaKantor: "Kantor Saklar",
          nama: "Bos",
          nomorHp: "081299990011",
          sandi: "sandi-rahasia-uji",
        })
      ).isi as Sesi;
      const kantorId = bos.pengguna.kantor.id;
      const t = await ketat("/auth/tautan", {});
      await ketat(
        "/auth/tautan/setujui",
        { kode: t.isi.kode, akun: { peran: "kolektor", nama: "Budi" } },
        bos.tokenAkses,
      );
      const k = (
        (await ketat(`/auth/tautan/${t.isi.id}/klaim`, { klaim: t.isi.klaim })).isi as Sesi
      ).tokenAkses;
      const absen = (kirim: ReturnType<typeof pengirim>) =>
        kirim("/lapangan/absen", { absensi: "masuk_kerja", kasLapangan: 0, uangJalan: 0 }, k);

      // Jam kerja setengah jam di paruh hari yang lain — pasti di luar jam sekarang.
      const jamWib = (new Date().getUTCHours() + 7) % 24;
      const [buka, tutup] = jamWib < 12 ? ["23:00", "23:30"] : ["01:00", "01:30"];
      // Pola pekan kerja tanpa hari ini (bit 0 = Minggu).
      const bukanHariIni = 127 & ~(1 << new Date(Date.now() + 7 * 3_600_000).getUTCDay());
      await tx.execute(
        sql`update kantor set jam_buka = ${buka}, jam_tutup = ${tutup} where id = ${kantorId}`,
      );

      // Bawaan (VPS): di luar jam kerja ditolak, dan HP diberi tahu.
      const kalKetat = (await ketat("/lapangan/hari-ini", undefined, k)).isi.kalender;
      expect(kalKetat.dalamJamKerja).toBe(false);
      const tanggal = kalKetat.tanggal as string;
      expect((await absen(ketat)).isi.kode).toBe("DI_LUAR_JAM_KERJA");

      // Hanya jam kerja dimatikan: hari bukan hari kerja tetap ditolak …
      await tx.execute(
        sql`update pekan_kerja set hari_kerja = ${bukanHariIni} where kantor_id = ${kantorId}`,
      );
      const tanpaJam = app({ jamKerja: false, hariKerja: true, liburKantor: true });
      expect((await absen(tanpaJam)).isi.kode).toBe("BUKAN_HARI_KERJA");
      // … begitu juga libur kantor.
      await tx.execute(sql`update pekan_kerja set hari_kerja = 127 where kantor_id = ${kantorId}`);
      await tx.execute(sql`
        insert into libur_kantor (kantor_id, tanggal, alasan_libur, dibuat_oleh)
        values (${kantorId}, ${tanggal}, 'Uji libur', ${bos.pengguna.id})`);
      expect((await absen(tanpaJam)).isi.kode).toBe("LIBUR_KANTOR");

      // Semua dimatikan (laptop): absen diterima, HP melihat lapangan buka.
      const longgar = app({ jamKerja: false, hariKerja: false, liburKantor: false });
      await tx.execute(
        sql`update pekan_kerja set hari_kerja = ${bukanHariIni} where kantor_id = ${kantorId}`,
      );
      expect((await longgar("/lapangan/hari-ini", undefined, k)).isi.kalender).toMatchObject({
        tanggal,
        dalamJamKerja: true,
        hariKerja: true,
        liburKantor: null,
      });
      expect((await absen(longgar)).status).toBe(201);
      // Wajib absen tidak ikut dimatikan: absen kedua tetap ditolak.
      expect((await absen(longgar)).isi.kode).toBe("SUDAH_ABSEN");
    });
  }, 120_000);
});
