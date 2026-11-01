import { describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
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

      // Unggahan ulang yang sah (jawaban hilang di jalan): foto yang sama, tanpa berkas baru.
      const ulang = await kirim("/foto", { isi: formulir(webp("satu")), token: k });
      expect(ulang.status).toBe(201);
      expect(ulang.isi.id).toBe(f1.isi.id);
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
        isi: { absensi: "masuk_kerja", kasLapangan: 100_000, uangJalan: 10_000 },
        token: k,
      });
      const akad = await kirim("/lapangan/akad", {
        isi: {
          nasabah: { nama: "sari", kampung: { nama: "pule" } },
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

      // Sesudah dipakai akad, foto yang sama tak boleh diunggah lagi; berkas yatimnya dibersihkan.
      const berkasSebelum = simpan.isi.size;
      const sesudahDipakai = await kirim("/foto", { isi: formulir(webp("satu")), token: k });
      expect(sesudahDipakai.status).toBe(409);
      expect(sesudahDipakai.isi.kode).toBe("FOTO_SUDAH_DIPAKAI");
      expect(simpan.isi.size).toBe(berkasSebelum);

      // Kolektor lain tak boleh membuka — sampai nasabahnya dioper kepadanya.
      const t = await kirim("/auth/tautan", { isi: {} });
      await kirim("/auth/tautan/setujui", {
        isi: { kode: t.isi.kode, akun: { peran: "kolektor", nama: "budi" } },
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

  test("foto kembar: hanya unggahan ulang yang sah mengembalikan foto yang sama", async () => {
    await dalamTransaksi(async (tx) => {
      const simpan = penyimpananMemori();
      const { kirim, bos, kolektor, kantorId } = await siapkanKantor(tx, { penyimpanan: simpan });
      const k = kolektor.tokenAkses;
      const b = bos.tokenAkses;
      const jumlahBaris = async () =>
        (
          (await tx.execute(
            sql`select count(*)::int as n from foto where kantor_id = ${kantorId}`,
          )) as unknown as { n: number }[]
        )[0]?.n;

      const asli = await kirim("/foto", { isi: formulir(webp("kembar")), token: k });
      expect(asli.status).toBe(201);

      // Pengunggah sama, jenis sama, belum dipakai, < 1 jam: foto yang sama, tanpa berkas/baris baru.
      const ulang = await kirim("/foto", { isi: formulir(webp("kembar")), token: k });
      expect(ulang.status).toBe(201);
      expect(ulang.isi).toEqual(asli.isi);
      expect(simpan.isi.size).toBe(1);
      expect(await jumlahBaris()).toBe(1);

      // Jenis lain atau orang lain: tetap foto kembar; berkas yatimnya dibersihkan.
      const jenisLain = await kirim("/foto", {
        isi: formulir(webp("kembar"), { jenis: "ktp" }),
        token: k,
      });
      expect(jenisLain.status).toBe(409);
      expect(jenisLain.isi.kode).toBe("FOTO_SUDAH_DIPAKAI");
      const orangLain = await kirim("/foto", {
        isi: formulir(webp("kembar"), { jenis: "ktp" }),
        token: b,
      });
      expect(orangLain.status).toBe(409);
      expect(simpan.isi.size).toBe(1);
      expect(await jumlahBaris()).toBe(1);

      // Lebih dari 1 jam: tetap foto kembar (sama dengan batas pemakaiannya di akad).
      await tx.execute(
        sql`update foto set dibuat_at = dibuat_at - interval '2 hours' where id = ${asli.isi.id}`,
      );
      const basi = await kirim("/foto", { isi: formulir(webp("kembar")), token: k });
      expect(basi.status).toBe(409);
      await tx.execute(
        sql`update foto set dibuat_at = dibuat_at + interval '2 hours' where id = ${asli.isi.id}`,
      );
      expect((await kirim("/foto", { isi: formulir(webp("kembar")), token: k })).status).toBe(201);

      // KTP milik bos yang belum ditunjuk nasabah: unggahan ulang sah juga.
      const ktp = await kirim("/foto", {
        isi: formulir(webp("ktp-bos"), { jenis: "ktp" }),
        token: b,
      });
      expect(ktp.status).toBe(201);
      const ktpUlang = await kirim("/foto", {
        isi: formulir(webp("ktp-bos"), { jenis: "ktp" }),
        token: b,
      });
      expect(ktpUlang.status).toBe(201);
      expect(ktpUlang.isi.id).toBe(ktp.isi.id);

      // Jenis sama tetapi pengunggah lain (kolektor menyalin KTP milik bos): foto kembar.
      const salinKtp = await kirim("/foto", {
        isi: formulir(webp("ktp-bos"), { jenis: "ktp" }),
        token: k,
      });
      expect(salinKtp.status).toBe(409);
      expect(salinKtp.isi.kode).toBe("FOTO_SUDAH_DIPAKAI");

      // Sudah dipakai akad (serah terima) atau menjadi KTP nasabah: tetap foto kembar.
      await kirim("/lapangan/absen", {
        isi: { absensi: "masuk_kerja", kasLapangan: 100_000, uangJalan: 10_000 },
        token: k,
      });
      const akad = await kirim("/lapangan/akad", {
        isi: {
          nasabah: { nama: "sari", kampung: { nama: "pule" } },
          jenis: "harian",
          pokok: 1_000_000,
          tenor: 24,
          fotoSerahTerimaId: asli.isi.id,
        },
        token: k,
      });
      expect(akad.status).toBe(201);
      const berkasSebelum = simpan.isi.size;
      expect((await kirim("/foto", { isi: formulir(webp("kembar")), token: k })).status).toBe(409);
      await tx.execute(
        sql`update nasabah set foto_ktp_id = ${ktp.isi.id} where id = ${akad.isi.nasabah.id}`,
      );
      const ktpDipakai = await kirim("/foto", {
        isi: formulir(webp("ktp-bos"), { jenis: "ktp" }),
        token: b,
      });
      expect(ktpDipakai.status).toBe(409);
      expect(ktpDipakai.isi.kode).toBe("FOTO_SUDAH_DIPAKAI");
      expect(simpan.isi.size).toBe(berkasSebelum);
    });
  }, 120_000);

  test("kalah balapan dengan unggahan identik: pemenang sah dikembalikan, selain itu 409", async () => {
    await dalamTransaksi(async (tx) => {
      const dasar = penyimpananMemori();
      // Saat berkas disimpan, "permintaan lain" sudah lebih dulu menyisipkan barisnya.
      let pemenang: { oleh: string; kantorId: string } | null = null;
      let idPemenang: string | null = null;
      const simpan = {
        ...dasar,
        async simpan(kunci: string, isi: Uint8Array<ArrayBuffer>) {
          await dasar.simpan(kunci, isi);
          if (!pemenang || idPemenang) return;
          const sha256 = createHash("sha256").update(isi).digest("hex");
          const [b] = (await tx.execute(
            sql`insert into foto (kantor_id, jenis, kunci_berkas, sha256, ukuran_byte, tipe_mime, diunggah_oleh)
                values (${pemenang.kantorId}, 'serah_terima', ${`kantor/uji/${sha256}.webp`}, ${sha256}, ${isi.length}, 'image/webp', ${pemenang.oleh})
                returning id`,
          )) as unknown as { id: string }[];
          idPemenang = b?.id ?? null;
        },
      };
      const { kirim, bos, kolektor, kantorId } = await siapkanKantor(tx, { penyimpanan: simpan });

      // Pemenangnya pengunggah yang sama: unggahan yang kalah mengembalikan foto pemenang.
      pemenang = { oleh: kolektor.pengguna.id, kantorId };
      const kalah = await kirim("/foto", {
        isi: formulir(webp("balapan-sendiri")),
        token: kolektor.tokenAkses,
      });
      expect(kalah.status).toBe(201);
      expect(kalah.isi.id).toBe(idPemenang);
      expect(dasar.isi.size).toBe(0); // berkas si kalah dibersihkan

      // Pemenangnya orang lain: tetap foto kembar.
      idPemenang = null;
      pemenang = { oleh: bos.pengguna.id, kantorId };
      const ditolak = await kirim("/foto", {
        isi: formulir(webp("balapan-orang-lain")),
        token: kolektor.tokenAkses,
      });
      expect(ditolak.status).toBe(409);
      expect(ditolak.isi.kode).toBe("FOTO_SUDAH_DIPAKAI");
      expect(dasar.isi.size).toBe(0);
    });
  }, 120_000);
});
