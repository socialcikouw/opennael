import type { Peran } from "@opennael/contracts";
import type { Aktor } from "./aktor";
import { dilarang } from "./galat";

/** Tolak (403) bila peran pemanggil tidak termasuk yang diizinkan. */
export function wajibPeran(aktor: Aktor, ...diizinkan: Peran[]): void {
  if (!diizinkan.includes(aktor.peran)) {
    throw dilarang("PERAN_DILARANG", "Peran Anda tidak boleh melakukan ini");
  }
}
