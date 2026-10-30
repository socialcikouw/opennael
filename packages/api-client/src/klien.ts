import type { RuteHariKolektor } from "@opennael/api/tipe/hari-kolektor";
import type { RuteIdentitas } from "@opennael/api/tipe/identitas";
import type { RuteKantor } from "@opennael/api/tipe/kantor";
import type { RuteKas } from "@opennael/api/tipe/kas";
import type { RuteMigrasi } from "@opennael/api/tipe/migrasi";
import type { RutePelaporan } from "@opennael/api/tipe/pelaporan";
import type { RutePembiayaan } from "@opennael/api/tipe/pembiayaan";
import type { RutePenggajian } from "@opennael/api/tipe/penggajian";
import { hc } from "hono/client";

/**
 * KLIEN RPC per konteks — tipe tiap klien hanya memuat rute konteksnya
 * (satu tipe gabungan seluruh API memperlambat `tsc`). Satu `fetch` bersama
 * (biasanya transport bersesi) dipakai semuanya.
 */
export function buatKlien(alamat: string, fetch: typeof globalThis.fetch) {
  const opsi = { fetch };
  return {
    hariKolektor: hc<RuteHariKolektor>(alamat, opsi),
    identitas: hc<RuteIdentitas>(alamat, opsi),
    kantor: hc<RuteKantor>(alamat, opsi),
    kas: hc<RuteKas>(alamat, opsi),
    migrasi: hc<RuteMigrasi>(alamat, opsi),
    pelaporan: hc<RutePelaporan>(alamat, opsi),
    pembiayaan: hc<RutePembiayaan>(alamat, opsi),
    penggajian: hc<RutePenggajian>(alamat, opsi),
  };
}

export type Klien = ReturnType<typeof buatKlien>;
