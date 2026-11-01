import type { Peran } from "@opennael/contracts";

/** Layar pertama tiap peran sesudah HP tertaut. */
export function layarAwal(peran: Peran) {
  // Aplikasi kolektor selalu dibuka di mode Harian, yang tab pertamanya Tagihan.
  if (peran === "kolektor") return "/kolektor/tagihan" as const;
  if (peran === "kasir") return "/kasir" as const;
  if (peran === "pengawas") return "/pengawas" as const;
  return "/beranda" as const;
}
