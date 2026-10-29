import { describe, expect, test } from "bun:test";
import { sql } from "drizzle-orm";
import { dalamTransaksi, siapkanKantor, URL_DB } from "../../../uji/bantu";

/** Rem bos tiga lapis — di SATU transaksi yang dibatalkan. */
describe.skipIf(!URL_DB)("kebijakan (rem bos)", () => {
  test("rem tiga lapis: kantor, kolektor, nasabah — dan dipakai lapangan", async () => {
    await dalamTransaksi(async (tx) => {
      const { kirim, bos, kolektor: andi, kantorId } = await siapkanKantor(tx);
      const b = bos.tokenAkses;
      const k = andi.tokenAkses;
      const andiId = andi.pengguna.id;
      const kode = (r: { isi: Record<string, unknown> }) => r.isi.kode;
      const baris = async <T>(q: ReturnType<typeof sql>) => (await tx.execute(q)) as unknown as T[];
      const aksi = async (tabel: string) =>
        (
          await baris<{ aksi: string }>(sql`
            select aksi from riwayat_perubahan where kantor_id = ${kantorId} and tabel = ${tabel}
            order by dibuat_at`)
        ).map((r) => r.aksi);

      // ---- rem tiga lapis --------------------------------------------------------------
      const rem = (jalur: string, isi: Record<string, unknown>, token = b) =>
        kirim(`/kebijakan/${jalur}`, { metode: "PUT", isi, token });
      const mati = {
        pinjamanBaruDikunci: false,
        naikPinjamanDikunci: false,
        gulungPinjamanDikunci: false,
      };
      expect(kode(await rem("kantor", mati, k))).toBe("PERAN_DILARANG");
      await rem("kantor", { ...mati, pinjamanBaruDikunci: true, alasanKunci: "akhir bulan" });
      await rem(`kolektor/${andiId}`, {
        ...mati,
        gulungPinjamanDikunci: true,
        alasanKunci: "Andi dievaluasi",
      });
      // Kolektor melihat gabungan kantor + dirinya; alasan dari lapis paling spesifik.
      expect((await kirim("/kebijakan", { token: k })).isi).toEqual({
        pinjamanBaruDikunci: true,
        naikPinjamanDikunci: false,
        gulungPinjamanDikunci: true,
        alasanKunci: "Andi dievaluasi",
      });
      // Bos melihat lapis kantor saja.
      expect((await kirim("/kebijakan", { token: b })).isi).toMatchObject({
        pinjamanBaruDikunci: true,
        gulungPinjamanDikunci: false,
        alasanKunci: "akhir bulan",
      });
      // Rem dipakai lapangan: akad baru ditolak.
      await kirim("/lapangan/absen", {
        isi: { absensi: "masuk_kerja", kasLapangan: 0, uangJalan: 0 },
        token: k,
      });
      const [foto] = await baris<{ id: string }>(sql`
        insert into foto (kantor_id, jenis, kunci_berkas, sha256, ukuran_byte, tipe_mime, diunggah_oleh)
        values (${kantorId}, 'serah_terima', 'f', ${"d".repeat(64)}, 1000, 'image/webp', ${andiId})
        returning id`);
      const akad = await kirim("/lapangan/akad", {
        isi: {
          nasabah: { nama: "Rina", kampung: { nama: "Pule" } },
          jenis: "harian",
          pokok: 1_000_000,
          tenor: 24,
          fotoSerahTerimaId: foto?.id,
        },
        token: k,
      });
      expect(kode(akad)).toBe("PINJAMAN_BARU_DIKUNCI");

      const [w] = await baris<{ id: string }>(sql`
        insert into wilayah (kantor_id, nama, dibuat_oleh) values (${kantorId}, 'Pule', ${andiId})
        on conflict do nothing returning id`);
      const wilayahId =
        w?.id ??
        (
          await baris<{ id: string }>(
            sql`select id from wilayah where kantor_id = ${kantorId} limit 1`,
          )
        )[0]?.id;
      const [n] = await baris<{ id: string }>(sql`
        insert into nasabah (kantor_id, kolektor_id, nama, wilayah_id) values (${kantorId}, ${andiId}, 'Sari', ${wilayahId})
        returning id`);
      await rem(`nasabah/${n?.id}`, { naikPinjamanDikunci: true, gulungPinjamanDikunci: false });
      const aktif = (await kirim("/kebijakan/aktif", { token: b })).isi;
      expect(aktif.map((r: { lapis: string }) => r.lapis).sort()).toEqual([
        "kantor",
        "kolektor",
        "nasabah",
      ]);
      expect(aktif.find((r: { lapis: string }) => r.lapis === "nasabah")).toMatchObject({
        sasaran: { nama: "Sari" },
        pinjamanBaruDikunci: false,
        naikPinjamanDikunci: true,
      });
      // Semua saklar mati → barisnya hilang.
      await rem("kantor", mati);
      expect((await kirim("/kebijakan/aktif", { token: b })).isi).toHaveLength(2);
      expect(await aksi("kebijakan")).toEqual(["atur_rem", "atur_rem", "atur_rem", "lepas_rem"]);
    });
  }, 60_000);
});
