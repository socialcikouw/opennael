import { describe, expect, test } from "bun:test";
import type { Sesi } from "@opennael/contracts";
import { sql } from "drizzle-orm";
import { dalamTransaksi, siapkanKantor, URL_DB } from "../../../uji/bantu";

/** Kelola karyawan & nasabah oleh bos — di SATU transaksi yang dibatalkan. */
describe.skipIf(!URL_DB)("kelola karyawan & nasabah", () => {
  test("daftar per peran, sunting, nonaktif & aktif, pindah pemegang, identitas, titik rumah", async () => {
    await dalamTransaksi(async (tx) => {
      const { kirim, bos, kolektor: andi, kantorId } = await siapkanKantor(tx);
      const b = bos.tokenAkses;
      const andiId = andi.pengguna.id;
      const kode = (r: { isi: Record<string, unknown> }) => r.isi.kode;
      const baris = async <T>(q: ReturnType<typeof sql>) => (await tx.execute(q)) as unknown as T[];
      const tautkan = async (peran: "kasir" | "pengawas" | "kolektor", nama: string) => {
        const t = await kirim("/auth/tautan", { isi: {} });
        await kirim("/auth/tautan/setujui", {
          isi: { kode: t.isi.kode, akun: { peran, nama } },
          token: b,
        });
        return (await kirim(`/auth/tautan/${t.isi.id}/klaim`, { isi: { klaim: t.isi.klaim } }))
          .isi as Sesi;
      };
      const kasir = await tautkan("kasir", "Sari");
      const pengawas = await tautkan("pengawas", "Wawan");
      const dedi = await tautkan("kolektor", "Dedi");
      const dediId = dedi.pengguna.id;

      // ---- daftar karyawan per peran -------------------------------------------------
      expect((await kirim("/pengguna", { token: b })).isi).toHaveLength(5);
      const dilihatKasir = (await kirim("/pengguna?peran=bos", { token: kasir.tokenAkses })).isi;
      expect(dilihatKasir.map((p: { nama: string }) => p.nama)).toEqual(["Andi", "Dedi"]);
      expect(kode(await kirim("/pengguna", { token: andi.tokenAkses }))).toBe("PERAN_DILARANG");

      // ---- sunting -------------------------------------------------------------------
      const ubah = (id: string, isi: Record<string, unknown>) =>
        kirim(`/pengguna/${id}`, { metode: "PATCH", isi, token: b });
      const andiBaru = await ubah(andiId, { resort: "Resort Utara", nomorHp: "0812-1111-2222" });
      expect(andiBaru.isi).toMatchObject({ resort: "Resort Utara", nomorHp: "+6281211112222" });
      expect(kode(await ubah(kasir.pengguna.id, { resort: "x" }))).toBe("RESORT_HANYA_KOLEKTOR");
      expect(kode(await ubah(bos.pengguna.id, { nomorHp: null }))).toBe("NOMOR_HP_BOS_WAJIB");

      // ---- nasabah --------------------------------------------------------------------
      const [w] = await baris<{ id: string }>(sql`
        insert into wilayah (kantor_id, nama, dibuat_oleh) values (${kantorId}, 'Pule', ${andiId})
        returning id`);
      const nasabahBaru = async (nama: string, isi: { nik?: string; diblokir?: boolean } = {}) =>
        (
          await baris<{ id: string }>(sql`
            insert into nasabah (kantor_id, kolektor_id, nama, wilayah_id, nik, saldo_tabungan,
              diblokir_at, diblokir_oleh, alasan_blokir)
            values (${kantorId}, ${andiId}, ${nama}, ${w?.id}, ${isi.nik ?? null}, 50000,
              ${isi.diblokir ? sql`now()` : null}, ${isi.diblokir ? bos.pengguna.id : null},
              ${isi.diblokir ? "diputihkan" : null})
            returning id`)
        )[0]?.id as string;
      const nSari = await nasabahBaru("Sari", { nik: "3201234567890001" });
      const nBudi = await nasabahBaru("Budi");
      const nTono = await nasabahBaru("Tono", { nik: "3201234567899999", diblokir: true });
      await tx.execute(sql`
        insert into pinjaman (kantor_id, pencair_id, dibuat_oleh, nasabah_id, pinjaman_ke, jenis, tenor,
          asal, tanggal_akad, tanggal_disalin, pokok, potongan_admin, tabungan_masuk, pencairan,
          total_kembali, angsuran, saldo_awal, drop_baru, saldo)
        values (${kantorId}, ${andiId}, ${bos.pengguna.id}, ${nSari}, 1, 'harian', 24, 'migrasi',
          '2026-08-01', '2026-09-01', 1000000, 0, 0, 0, 1200000, 50000, 900000, 0, 900000)`);

      const daftarBos = (await kirim("/nasabah", { token: b })).isi;
      expect(daftarBos).toHaveLength(3);
      expect(daftarBos[1]).toMatchObject({
        nama: "Sari",
        nik: "3201234567890001",
        saldoTabungan: 50_000,
        diblokir: false,
        pinjamanAktif: { status: "berjalan", saldo: 900_000 },
        kolektor: { nama: "Andi" },
      });
      const dariPengawas = (await kirim("/nasabah?cari=sar", { token: pengawas.tokenAkses })).isi;
      expect(dariPengawas).toHaveLength(1);
      expect(dariPengawas[0].nik).toBe("3201********0001");
      const dariKasir = (await kirim("/nasabah?cari=sar", { token: kasir.tokenAkses })).isi;
      expect(dariKasir[0]).toMatchObject({
        nama: "Sari",
        kampung: { nama: "Pule" },
        nik: null,
        kolektor: null,
      });
      expect(
        (await kirim("/nasabah?bebas=ya", { token: b })).isi.map((n: { nama: string }) => n.nama),
      ).toEqual(["Budi"]);
      expect((await kirim("/nasabah", { token: dedi.tokenAkses })).isi).toHaveLength(0);
      expect(kode(await kirim(`/nasabah?kolektorId=${andiId}`, { token: dedi.tokenAkses }))).toBe(
        "BUKAN_MILIK_ANDA",
      );

      // Sunting identitas: kampung baru dibuat, NIK dihapus — jejak NIK tersamar.
      const sari = await kirim(`/nasabah/${nSari}`, {
        metode: "PATCH",
        isi: { nama: "Sari Dewi", kampung: { nama: " pule  barat " }, nik: null },
        token: b,
      });
      expect(sari.isi).toMatchObject({ nama: "Sari Dewi", nik: null });
      expect(sari.isi.kampung.nama).not.toBe("Pule");
      const [jejak] = await baris<{
        sebelum: Record<string, unknown>;
        sesudah: Record<string, unknown>;
      }>(sql`
        select sebelum, sesudah from riwayat_perubahan where baris_id = ${nSari} and aksi = 'perbaiki_nasabah'`);
      expect(jejak?.sebelum).toMatchObject({ nama: "Sari", nik: "3201********0001" });
      expect(jejak?.sesudah).toMatchObject({ nama: "Sari Dewi", nik: null });
      expect(
        kode(
          await kirim(`/nasabah/${nBudi}`, {
            metode: "PATCH",
            isi: { nik: "3201234567899999" },
            token: b,
          }),
        ),
      ).toBe("NIK_SUDAH_TERDAFTAR");
      expect(
        kode(
          await kirim(`/nasabah/${nBudi}`, {
            metode: "PATCH",
            isi: { nama: "x" },
            token: kasir.tokenAkses,
          }),
        ),
      ).toBe("PERAN_DILARANG");

      // Titik rumah: kolektor pemegang saja.
      const titik = { latitude: -7.25, longitude: 112.75, akurasiMeter: 8 };
      expect(
        kode(
          await kirim(`/nasabah/${nSari}/lokasi`, {
            metode: "PUT",
            isi: titik,
            token: dedi.tokenAkses,
          }),
        ),
      ).toBe("BUKAN_PEGANGAN_ANDA");
      const direkam = await kirim(`/nasabah/${nSari}/lokasi`, {
        metode: "PUT",
        isi: titik,
        token: andi.tokenAkses,
      });
      expect(direkam.isi.lokasi).toEqual(titik);

      // ---- nonaktifkan: pegangan aktif dipindah dulu -------------------------------------
      const nonaktifkan = (id: string) =>
        kirim(`/pengguna/${id}/nonaktifkan`, { isi: { alasan: "berhenti bekerja" }, token: b });
      expect(kode(await nonaktifkan(bos.pengguna.id))).toBe("TIDAK_BISA_MENONAKTIFKAN_DIRI");
      expect(kode(await nonaktifkan(andiId))).toBe("KOLEKTOR_MASIH_MEMEGANG_NASABAH");
      const pindah = (id: string, kolektorId: string) =>
        kirim(`/nasabah/${id}/pindah`, { isi: { kolektorId }, token: b });
      expect(kode(await pindah(nSari, andiId))).toBe("TIDAK_ADA_PERUBAHAN");
      expect((await pindah(nSari, dediId)).isi.kolektor).toEqual({ id: dediId, nama: "Dedi" });
      // Nasabah tanpa pinjaman aktif (Budi, Tono) tak menahan penonaktifan.
      const mati = await nonaktifkan(andiId);
      expect(mati.isi).toMatchObject({
        aktif: false,
        alasanNonaktif: "berhenti bekerja",
        perangkatAktif: 0,
      });
      expect(kode(await nonaktifkan(andiId))).toBe("SUDAH_NONAKTIF");
      // Sesi HP Andi tak bisa diperpanjang lagi.
      expect((await kirim("/auth/refresh", { isi: { tokenSegar: andi.tokenSegar } })).status).toBe(
        401,
      );
      expect(kode(await pindah(nTono, andiId))).toBe("KOLEKTOR_NONAKTIF");
      expect((await kirim("/pengguna", { token: b })).isi).toHaveLength(4);
      expect((await kirim("/pengguna?termasukNonaktif=ya", { token: b })).isi).toHaveLength(5);

      const hidup = await kirim(`/pengguna/${andiId}/aktifkan`, { token: b, metode: "POST" });
      expect(hidup.isi).toMatchObject({ aktif: true, alasanNonaktif: null });
      expect(kode(await kirim(`/pengguna/${andiId}/aktifkan`, { token: b, metode: "POST" }))).toBe(
        "SUDAH_AKTIF",
      );
      const aksi = await baris<{ aksi: string }>(sql`
        select aksi from riwayat_perubahan where baris_id = ${andiId} and tabel = 'pengguna'
        order by dibuat_at`);
      expect(aksi.map((a) => a.aksi)).toEqual(
        expect.arrayContaining(["ubah_pengguna", "nonaktifkan", "aktifkan"]),
      );
    });
  }, 60_000);
});
