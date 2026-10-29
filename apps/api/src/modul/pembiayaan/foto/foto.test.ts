import { describe, expect, test } from "bun:test";
import { sql } from "drizzle-orm";
import { penyimpananMemori } from "../../../platform/penyimpanan";
import { dalamTransaksi, siapkanKantor, URL_DB } from "../../../uji/bantu";

/** Isi berkas WebP / JPEG minimal (cukup tanda pengenal di depannya). */
const webp = (isi: string) =>
  new Uint8Array([
    ...new TextEncoder().encode("RIFF"),
    0,
    0,
    0,
    0,
    ...new TextEncoder().encode(`WEBP${isi}`),
  ]);
const jpeg = (isi: string) => new Uint8Array([0xff, 0xd8, 0xff, ...new TextEncoder().encode(isi)]);

const formulir = (berkas: Uint8Array, isi: Record<string, string> = {}) => {
  const f = new FormData();
  f.set("berkas", new File([berkas], "foto.bin"));
  f.set("jenis", "serah_terima");
  for (const [k, v] of Object.entries(isi)) f.set(k, v);
  return f;
};

describe.skipIf(!URL_DB)("foto bukti", () => {
  test("unggah, tolak kembar & bukan foto, baca, dan dipakai akad", async () => {
    await dalamTransaksi(async (tx) => {
      const simpan = penyimpananMemori();
      const { kirim, bos, kolektor } = await siapkanKantor(tx, { penyimpanan: simpan });
      const k = kolektor.tokenAkses;

      const f1 = await kirim("/foto", {
        isi: formulir(webp("satu"), { latitude: "-7.5", longitude: "110.4", akurasiMeter: "8" }),
        token: k,
      });
      expect(f1.status).toBe(201);
      expect(f1.isi).toMatchObject({ jenis: "serah_terima", tipeMime: "image/webp" });
      expect(simpan.isi.size).toBe(1);

      // Foto yang sama (sidik jari sama) ditolak; berkas yatimnya dibersihkan.
      const kembar = await kirim("/foto", { isi: formulir(webp("satu")), token: k });
      expect(kembar.status).toBe(409);
      expect(kembar.isi.kode).toBe("FOTO_SUDAH_DIPAKAI");
      expect(simpan.isi.size).toBe(1);

      expect(
        (await kirim("/foto", { isi: formulir(new TextEncoder().encode("bukan foto")), token: k }))
          .isi.kode,
      ).toBe("BUKAN_FOTO");
      expect((await kirim("/foto", { isi: formulir(jpeg("dua")), token: k })).isi.tipeMime).toBe(
        "image/jpeg",
      );
      expect(
        (await kirim("/foto", { isi: formulir(webp("tiga"), { latitude: "-7.5" }), token: k })).isi
          .kode,
      ).toBe("LOKASI_TIDAK_LENGKAP");
      const besar = await kirim("/foto", { isi: formulir(webp("x".repeat(2_100_000))), token: k });
      expect(besar.status).toBe(413);

      // Bos tidak memotret serah terima; KTP boleh.
      expect(
        (await kirim("/foto", { isi: formulir(webp("empat")), token: bos.tokenAkses })).status,
      ).toBe(403);
      expect(
        (
          await kirim("/foto", {
            isi: formulir(webp("lima"), { jenis: "ktp" }),
            token: bos.tokenAkses,
          })
        ).status,
      ).toBe(201);
      expect((await kirim("/foto", { isi: formulir(webp("enam")) })).status).toBe(401);

      // Berkas dibaca pengunggah & bos.
      const dibaca = await kirim(`/foto/${f1.isi.id}`, { token: k });
      expect(dibaca.status).toBe(200);
      expect(dibaca.kepala.get("Content-Type")).toBe("image/webp");
      expect([...dibaca.isi.berkas]).toEqual([...webp("satu")]);
      expect((await kirim(`/foto/${f1.isi.id}`, { token: bos.tokenAkses })).status).toBe(200);

      // Dipakai akad: foto hasil unggah lolos pemeriksaan serah terima.
      await kirim("/lapangan/absen", {
        isi: { absensi: "masuk_kerja", kasLapangan: 0, uangJalan: 0 },
        token: k,
      });
      const akad = await kirim("/lapangan/akad", {
        isi: {
          nasabah: { nama: "Sari", kampung: { nama: "Pule" } },
          jenis: "harian",
          pokok: 1_000_000,
          tenor: 24,
          fotoSerahTerimaId: f1.isi.id,
        },
        token: k,
      });
      expect(akad.status).toBe(201);
      const [p] = (await tx.execute(
        sql`select foto_serah_terima_id from pinjaman where id = ${akad.isi.id}`,
      )) as unknown as { foto_serah_terima_id: string }[];
      expect(p?.foto_serah_terima_id).toBe(f1.isi.id);
      // Kartu pinjaman membawa id fotonya (foto profil nasabah di HP).
      expect(akad.isi.fotoSerahTerimaId).toBe(f1.isi.id);

      // Kolektor lain tak boleh membuka — sampai nasabahnya dioper kepadanya.
      const t = await kirim("/auth/tautan", { isi: {} });
      await kirim("/auth/tautan/setujui", {
        isi: { kode: t.isi.kode, akun: { peran: "kolektor", nama: "Budi" } },
        token: bos.tokenAkses,
      });
      const budi = (await kirim(`/auth/tautan/${t.isi.id}/klaim`, { isi: { klaim: t.isi.klaim } }))
        .isi;
      expect((await kirim(`/foto/${f1.isi.id}`, { token: budi.tokenAkses })).status).toBe(403);
      await tx.execute(
        sql`update nasabah set kolektor_id = ${budi.pengguna.id} where id = ${akad.isi.nasabah.id}`,
      );
      expect((await kirim(`/foto/${f1.isi.id}`, { token: budi.tokenAkses })).status).toBe(200);
    });
  }, 120_000);
});
