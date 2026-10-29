import type { Peran } from "@opennael/contracts";

/** Siapa yang memanggil API — dibaca dari token akses. */
export interface Aktor {
  penggunaId: string;
  kantorId: string;
  peran: Peran;
  perangkatId: string;
}
