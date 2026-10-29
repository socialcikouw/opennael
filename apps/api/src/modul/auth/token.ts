import { createHmac, timingSafeEqual } from "node:crypto";
import type { Peran } from "@opennael/contracts";
import { sign, verify } from "hono/jwt";
import type { Aktor } from "../../platform/http/aktor";

/** Umur token akses (JWT). Pendek: pencabutan sesi berlaku paling lambat sekian. */
export const AKSES_BERLAKU_DETIK = 15 * 60;
/** Umur sesi perangkat; bergeser maju tiap refresh. */
export const SESI_BERLAKU_MS = 90 * 24 * 60 * 60 * 1000;

export function buatTokenAkses(rahasia: string) {
  return {
    async tandatangani(a: Aktor, sekarang: Date): Promise<string> {
      const iat = Math.floor(sekarang.getTime() / 1000);
      return sign(
        {
          sub: a.penggunaId,
          kantor: a.kantorId,
          peran: a.peran,
          dev: a.perangkatId,
          iat,
          exp: iat + AKSES_BERLAKU_DETIK,
        },
        rahasia,
        "HS256",
      );
    },
    /** Melempar bila palsu atau kedaluwarsa. */
    async periksa(token: string): Promise<Aktor> {
      const p = await verify(token, rahasia, "HS256");
      return {
        penggunaId: String(p.sub),
        kantorId: String(p.kantor),
        peran: p.peran as Peran,
        perangkatId: String(p.dev),
      };
    },
  };
}

/**
 * Token segar PER PERANGKAT: `pr1.<perangkatId>.<putaran>.<mac>`,
 * mac = HMAC-SHA256(rahasia, "pr1.<id>.<putaran>"). Tidak disimpan di
 * database — cukup `perangkat.putaran`, sehingga token putaran-N bisa dibuat
 * ulang kapan saja. Lihat docs/skema/schema-perangkat.md.
 */
const AWALAN = "pr1";
const POLA_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function buatTokenSegar(rahasia: string) {
  const mac = (isi: string) => createHmac("sha256", rahasia).update(isi).digest("base64url");
  return {
    buat(perangkatId: string, putaran: number): string {
      const isi = `${AWALAN}.${perangkatId}.${putaran}`;
      return `${isi}.${mac(isi)}`;
    },
    /** `null` bila bentuknya salah atau tanda tangannya palsu. */
    urai(token: string): { perangkatId: string; putaran: number } | null {
      const [awalan, perangkatId = "", putaranTeks = "", tanda = "", ...lebih] = token.split(".");
      const putaran = Number(putaranTeks);
      if (
        awalan !== AWALAN ||
        lebih.length > 0 ||
        !POLA_UUID.test(perangkatId) ||
        !Number.isSafeInteger(putaran) ||
        putaran < 1 ||
        String(putaran) !== putaranTeks
      ) {
        return null;
      }
      const harus = Buffer.from(mac(`${AWALAN}.${perangkatId}.${putaran}`));
      const ada = Buffer.from(tanda);
      if (ada.length !== harus.length || !timingSafeEqual(ada, harus)) return null;
      return { perangkatId, putaran };
    },
  };
}
