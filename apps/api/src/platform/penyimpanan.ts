import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, normalize } from "node:path";

/**
 * PENYIMPANAN BERKAS — satu antarmuka, penggerak bisa diganti: disk lokal
 * (pengembangan & VPS) sekarang, S3/R2 kelak. Database hanya menyimpan
 * `kunci_berkas`; berkasnya di sini (docs/skema/schema-foto.md).
 */
export interface Penyimpanan {
  simpan(kunci: string, isi: Uint8Array): Promise<void>;
  /** `null` bila tidak ada. */
  baca(kunci: string): Promise<Uint8Array<ArrayBuffer> | null>;
  hapus(kunci: string): Promise<void>;
}

/** Kunci tak boleh keluar dari folder akar (`..`, jalur mutlak). */
function amankan(akar: string, kunci: string): string {
  const jalur = normalize(join(akar, kunci));
  if (!jalur.startsWith(normalize(akar))) throw new Error(`kunci berkas tidak sah: ${kunci}`);
  return jalur;
}

export function penyimpananDisk(akar: string): Penyimpanan {
  return {
    async simpan(kunci, isi) {
      const jalur = amankan(akar, kunci);
      await mkdir(dirname(jalur), { recursive: true });
      await writeFile(jalur, isi);
    },
    async baca(kunci) {
      try {
        return new Uint8Array(await readFile(amankan(akar, kunci)));
      } catch {
        return null;
      }
    },
    async hapus(kunci) {
      await rm(amankan(akar, kunci), { force: true });
    },
  };
}

/** Untuk uji: berkas di memori. */
export function penyimpananMemori(): Penyimpanan & { isi: Map<string, Uint8Array<ArrayBuffer>> } {
  const isi = new Map<string, Uint8Array<ArrayBuffer>>();
  return {
    isi,
    async simpan(kunci, data) {
      isi.set(kunci, new Uint8Array(data));
    },
    async baca(kunci) {
      return isi.get(kunci) ?? null;
    },
    async hapus(kunci) {
      isi.delete(kunci);
    },
  };
}

/** Jenis gambar dari ISI berkas (bukan nama/kepala yang dikirim klien). */
export function jenisGambar(isi: Uint8Array): "image/jpeg" | "image/webp" | null {
  if (isi.length >= 3 && isi[0] === 0xff && isi[1] === 0xd8 && isi[2] === 0xff) return "image/jpeg";
  const teks = (dari: number, sampai: number) => String.fromCharCode(...isi.slice(dari, sampai));
  if (isi.length >= 12 && teks(0, 4) === "RIFF" && teks(8, 12) === "WEBP") return "image/webp";
  return null;
}
