import { createHash } from "node:crypto";
import { type FotoTersimpan, UKURAN_FOTO_MAKS } from "@opennael/contracts";
import { and, eq, or } from "drizzle-orm";
import type { Db } from "../../../platform/db/klien";
import { foto, nasabah, pinjaman } from "../../../platform/db/skema";
import type { Aktor } from "../../../platform/http/aktor";
import { dilarang, GalatApp, galatPostgres, tidakDitemukan } from "../../../platform/http/galat";
import { wajibPeran } from "../../../platform/http/peran";
import { jenisGambar, type Penyimpanan } from "../../../platform/penyimpanan";
import { UMUR_FOTO_MS } from "./data";

export interface FotoDeps {
  db: Db;
  penyimpanan: Penyimpanan;
  sekarang?: () => Date;
}

export interface UnggahFoto {
  jenis: "serah_terima" | "ktp";
  berkas: File;
  diambilAt?: string | undefined;
  latitude?: number | undefined;
  longitude?: number | undefined;
  akurasiMeter?: number | undefined;
}

const tidakSahBerkas = (kode: string, pesan: string) => new GalatApp(422, kode, pesan);

/**
 * FOTO BUKTI (docs/skema/schema-foto.md): tipe diperiksa dari isi berkas,
 * sidik jari SHA-256 dihitung server (foto kembar per kantor ditolak), jam
 * server yang dipercaya. Berkas disimpan dulu, baru barisnya — berkas yatim
 * bila penyisipan gagal dibersihkan seketika. Unggahan ulang foto yang sama
 * (jawaban hilang di jalan) mengembalikan fotonya — lihat `unggahanSama`.
 */
export function buatLayananFoto(deps: FotoDeps) {
  const sekarang = deps.sekarang ?? (() => new Date());

  return {
    async unggah(aktor: Aktor, input: UnggahFoto): Promise<FotoTersimpan> {
      // Serah terima: kolektor di lapangan. KTP: kolektor atau bos.
      if (input.jenis === "serah_terima") wajibPeran(aktor, "kolektor");
      else wajibPeran(aktor, "kolektor", "bos");

      const isi = new Uint8Array(await input.berkas.arrayBuffer());
      if (isi.length === 0 || isi.length > UKURAN_FOTO_MAKS) {
        throw tidakSahBerkas(
          "UKURAN_FOTO_TIDAK_SAH",
          "Foto harus lebih dari 0 dan paling besar 2 MB",
        );
      }
      const tipeMime = jenisGambar(isi);
      if (!tipeMime) throw tidakSahBerkas("BUKAN_FOTO", "Berkas bukan foto JPEG atau WebP");
      const lokasiLengkap =
        input.latitude !== undefined &&
        input.longitude !== undefined &&
        input.akurasiMeter !== undefined;
      const lokasiSebagian =
        !lokasiLengkap &&
        (input.latitude !== undefined ||
          input.longitude !== undefined ||
          input.akurasiMeter !== undefined);
      if (lokasiSebagian) {
        throw tidakSahBerkas(
          "LOKASI_TIDAK_LENGKAP",
          "Lokasi harus lengkap: lintang, bujur, dan akurasi",
        );
      }

      const kini = sekarang();
      const sha256 = createHash("sha256").update(isi).digest("hex");
      const ulang = await unggahanSama(deps.db, aktor, input.jenis, sha256, kini);
      if (ulang) return ulang;

      const id = crypto.randomUUID();
      const bulan = kini.toISOString().slice(0, 7).replace("-", "/");
      const kunciBerkas = `kantor/${aktor.kantorId}/foto/${bulan}/${id}.${tipeMime === "image/jpeg" ? "jpg" : "webp"}`;

      await deps.penyimpanan.simpan(kunciBerkas, isi);
      try {
        const [f] = await deps.db.transaction((tx) =>
          tx
            .insert(foto)
            .values({
              id,
              kantorId: aktor.kantorId,
              jenis: input.jenis,
              kunciBerkas,
              sha256,
              ukuranByte: isi.length,
              tipeMime,
              ...(lokasiLengkap
                ? {
                    latitude: input.latitude,
                    longitude: input.longitude,
                    akurasiMeter: input.akurasiMeter,
                  }
                : {}),
              diambilAt: input.diambilAt ? new Date(input.diambilAt) : null,
              diunggahOleh: aktor.penggunaId,
              dibuatAt: kini,
            })
            .returning({
              id: foto.id,
              jenis: foto.jenis,
              ukuranByte: foto.ukuranByte,
              tipeMime: foto.tipeMime,
              dibuatAt: foto.dibuatAt,
            }),
        );
        if (!f) throw new Error("gagal mencatat foto");
        return { ...f, tipeMime, dibuatAt: f.dibuatAt.toISOString() };
      } catch (e) {
        await deps.penyimpanan.hapus(kunciBerkas);
        // Kalah balapan dengan unggahan identik yang bersamaan: pemenangnya dibaca ulang
        // dengan aturan yang sama (bukan foto kembar milik orang lain / yang sudah dipakai).
        if (galatPostgres(e)?.constraint_name === "uniq_foto_kantor_sha256") {
          const pemenang = await unggahanSama(deps.db, aktor, input.jenis, sha256, kini);
          if (pemenang) return pemenang;
        }
        throw e;
      }
    },

    /**
     * Isi berkas — bos & pengawas; kolektor pengunggahnya atau pemegang nasabah
     * pemilik foto (serah terima pinjamannya / KTP-nya). Kasir tidak.
     */
    async baca(aktor: Aktor, id: string) {
      const [f] = await deps.db
        .select({ kunci: foto.kunciBerkas, tipeMime: foto.tipeMime, oleh: foto.diunggahOleh })
        .from(foto)
        .where(and(eq(foto.id, id), eq(foto.kantorId, aktor.kantorId)))
        .limit(1);
      if (!f) throw tidakDitemukan("FOTO_TIDAK_DITEMUKAN", "Foto tidak ditemukan");
      const boleh =
        aktor.peran === "bos" ||
        aktor.peran === "pengawas" ||
        f.oleh === aktor.penggunaId ||
        (aktor.peran === "kolektor" && (await pegangKolektor(deps.db, aktor, id)));
      if (!boleh) throw dilarang("PERAN_DILARANG", "Anda tidak boleh membuka foto ini");
      const isi = await deps.penyimpanan.baca(f.kunci);
      if (!isi) throw tidakDitemukan("BERKAS_HILANG", "Berkas foto tidak ditemukan di penyimpanan");
      return { isi, tipeMime: f.tipeMime };
    },
  };
}

/**
 * Unggahan ulang yang sah (docs/skema/schema-foto.md, "Unggahan ulang"): foto
 * dengan sidik jari sama di kantor ini yang diunggah orang yang sama, berjenis
 * sama, belum ditunjuk pinjaman/nasabah mana pun, dan berumur < 1 jam. Selain
 * itu null — penyisipan lalu ditolak database sebagai foto kembar (409).
 */
async function unggahanSama(
  db: Db,
  aktor: Aktor,
  jenis: UnggahFoto["jenis"],
  sha256: string,
  kini: Date,
): Promise<FotoTersimpan | null> {
  const [f] = await db
    .select({
      id: foto.id,
      jenis: foto.jenis,
      ukuranByte: foto.ukuranByte,
      tipeMime: foto.tipeMime,
      dibuatAt: foto.dibuatAt,
      oleh: foto.diunggahOleh,
    })
    .from(foto)
    .where(and(eq(foto.kantorId, aktor.kantorId), eq(foto.sha256, sha256)))
    .limit(1);
  if (!f || f.oleh !== aktor.penggunaId || f.jenis !== jenis) return null;
  if (kini.getTime() - f.dibuatAt.getTime() > UMUR_FOTO_MS) return null;
  if (f.tipeMime !== "image/jpeg" && f.tipeMime !== "image/webp") return null;
  const [dipakaiPinjaman] = await db
    .select({ id: pinjaman.id })
    .from(pinjaman)
    .where(and(eq(pinjaman.kantorId, aktor.kantorId), eq(pinjaman.fotoSerahTerimaId, f.id)))
    .limit(1);
  if (dipakaiPinjaman) return null;
  const [dipakaiNasabah] = await db
    .select({ id: nasabah.id })
    .from(nasabah)
    .where(and(eq(nasabah.kantorId, aktor.kantorId), eq(nasabah.fotoKtpId, f.id)))
    .limit(1);
  if (dipakaiNasabah) return null;
  return {
    id: f.id,
    jenis: f.jenis,
    ukuranByte: f.ukuranByte,
    tipeMime: f.tipeMime,
    dibuatAt: f.dibuatAt.toISOString(),
  };
}

/** Foto ini milik nasabah pegangan kolektor `aktor` (serah terima pinjamannya atau KTP-nya)? */
async function pegangKolektor(db: Db, aktor: Aktor, fotoId: string): Promise<boolean> {
  const [n] = await db
    .select({ id: nasabah.id })
    .from(nasabah)
    .leftJoin(pinjaman, eq(pinjaman.nasabahId, nasabah.id))
    .where(
      and(
        eq(nasabah.kantorId, aktor.kantorId),
        eq(nasabah.kolektorId, aktor.penggunaId),
        or(eq(pinjaman.fotoSerahTerimaId, fotoId), eq(nasabah.fotoKtpId, fotoId)),
      ),
    )
    .limit(1);
  return n !== undefined;
}

export type LayananFoto = ReturnType<typeof buatLayananFoto>;
