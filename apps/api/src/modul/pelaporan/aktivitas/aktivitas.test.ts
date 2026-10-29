import { describe, expect, test } from "bun:test";
import type { Aktivitas, Sesi } from "@opennael/contracts";
import { geserTanggal } from "@opennael/domain";
import { sql } from "drizzle-orm";
import { dalamTransaksi, siapkanKantor, URL_DB } from "../../../uji/bantu";

describe.skipIf(!URL_DB)("aktivitas & riwayat", () => {
  test("gabungan jejak & tabel uang, saringan pelaku, peran, jejak satu baris", async () => {
    await dalamTransaksi(async (tx) => {
      const { kirim, bos, kolektor: andi, kantorId } = await siapkanKantor(tx);
      const b = bos.tokenAkses;
      const bosId = bos.pengguna.id;
      const andiId = andi.pengguna.id;
      const t = await kirim("/auth/tautan", { isi: {} });
      await kirim("/auth/tautan/setujui", {
        isi: { kode: t.isi.kode, akun: { peran: "pengawas", nama: "Wawan" } },
        token: b,
      });
      const pengawas = (
        await kirim(`/auth/tautan/${t.isi.id}/klaim`, { isi: { klaim: t.isi.klaim } })
      ).isi as Sesi;
      const baris = async <T>(q: ReturnType<typeof sql>) => (await tx.execute(q)) as unknown as T[];
      const [h] = await baris<{ t: string }>(sql`select kantor_hari_ini(${kantorId})::text as t`);
      const hari = h?.t as string;

      // ---- kejadian hari ini ------------------------------------------------------------
      // Kas kantor: setor modal lalu dibatalkan.
      await kirim("/kas/buka", { isi: { tunai: 5_000_000, bank: 0 }, token: b });
      const mutasi = await kirim("/kas/mutasi", {
        isi: { jenis: "setor_modal", keAkun: "tunai", nominal: 1_000_000, keterangan: "Modal" },
        token: b,
      });
      expect(mutasi.status).toBe(200);
      await kirim(`/kas/mutasi/${mutasi.isi.id}/batal`, {
        isi: { alasan: "salah ketik" },
        token: b,
      });
      // Data ditimpa: nama karyawan.
      await kirim(`/pengguna/${andiId}`, { metode: "PATCH", isi: { nama: "Andi S" }, token: b });
      // Akad baru Rina hari ini, dicatat bos untuk Andi.
      const [w] = await baris<{ id: string }>(sql`
        insert into wilayah (kantor_id, nama, dibuat_oleh) values (${kantorId}, 'Pule', ${andiId}) returning id`);
      const [n] = await baris<{ id: string }>(sql`
        insert into nasabah (kantor_id, kolektor_id, nama, wilayah_id)
        values (${kantorId}, ${andiId}, 'Rina', ${w?.id}) returning id`);
      const [f] = await baris<{ id: string }>(sql`
        insert into foto (kantor_id, jenis, kunci_berkas, sha256, ukuran_byte, tipe_mime, diunggah_oleh)
        values (${kantorId}, 'serah_terima', 'f', ${"e".repeat(64)}, 1000, 'image/webp', ${andiId}) returning id`);
      await tx.execute(sql`
        insert into pinjaman (kantor_id, pencair_id, dibuat_oleh, nasabah_id, pinjaman_ke, jenis, tenor,
          asal, tanggal_akad, foto_serah_terima_id, pokok, potongan_admin, tabungan_masuk, pencairan,
          total_kembali, angsuran, saldo_awal, drop_baru, saldo)
        values (${kantorId}, ${andiId}, ${bosId}, ${n?.id}, 1, 'harian', 24, 'baru', ${hari}, ${f?.id},
          1000000, 50000, 50000, 900000, 1200000, 50000, 1200000, 1000000, 1200000)`);

      // ---- bos: semua kejadian, terbaru dulu --------------------------------------------
      const semua = (await kirim("/aktivitas", { token: b })).isi as unknown as Aktivitas[];
      const waktu = semua.map((a) => a.waktu);
      expect(waktu).toEqual([...waktu].sort().reverse());
      const cari = (kejadian: string) => semua.find((a) => a.kejadian === kejadian);
      expect(cari("mutasi_kas")).toMatchObject({
        pelaku: { id: bosId, nama: "Bos" },
        peran: "bos",
        ringkasan: "Setor modal: Modal",
        nominal: 1_000_000,
        alasan: null,
        rujukan: { tabel: "mutasi_kas_kantor", id: mutasi.isi.id },
      });
      expect(cari("batal_mutasi_kas")).toMatchObject({
        ringkasan: "Batal setor modal: Modal",
        nominal: 1_000_000,
        alasan: "salah ketik",
      });
      expect(cari("ubah_pengguna")).toMatchObject({
        ringkasan: "Ubah data karyawan Andi S",
        nominal: null,
        rujukan: { tabel: "pengguna", id: andiId },
      });
      expect(cari("akad")).toMatchObject({
        pelaku: { id: bosId },
        ringkasan: "Akad baru harian Rina (pinjaman ke-1)",
        nominal: 1_000_000,
      });
      expect(
        semua
          .filter((a) => a.kejadian === "setujui_tautan")
          .map((a) => a.ringkasan)
          .sort(),
      ).toEqual(["Setujui tautan HP Andi S", "Setujui tautan HP Wawan"]);

      // ---- saringan pelaku, tanggal lain, peran -----------------------------------------
      const milikAndi = (await kirim(`/aktivitas?pelakuId=${andiId}`, { token: b })).isi;
      expect((milikAndi as unknown as Aktivitas[]).every((a) => a.pelaku.id === andiId)).toBe(true);
      expect(
        (await kirim(`/aktivitas?tanggal=${geserTanggal(hari, -1)}`, { token: b })).isi,
      ).toEqual([]);
      const lihatPengawas = (await kirim("/aktivitas", { token: pengawas.tokenAkses }))
        .isi as unknown as Aktivitas[];
      expect(lihatPengawas.some((a) => a.kejadian === "akad")).toBe(true);
      expect(lihatPengawas.some((a) => a.kejadian.endsWith("mutasi_kas"))).toBe(false);
      expect((await kirim("/aktivitas", { token: andi.tokenAkses })).isi.kode).toBe(
        "PERAN_DILARANG",
      );

      // ---- jejak satu baris -------------------------------------------------------------
      const jejak = (
        await kirim(`/riwayat?tabel=pengguna&barisId=${andiId}`, { token: pengawas.tokenAkses })
      ).isi;
      expect(jejak.find((j: { aksi: string }) => j.aksi === "ubah_pengguna")).toMatchObject({
        pelaku: { id: bosId, nama: "Bos" },
        sebelum: { nama: "Andi" },
        sesudah: { nama: "Andi S" },
      });
      expect((await kirim("/riwayat?tabel=entah&barisId=x", { token: b })).status).toBe(400);
    });
  }, 60_000);
});
