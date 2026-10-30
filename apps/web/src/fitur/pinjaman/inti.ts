import type { KartuPinjaman } from "@opennael/contracts";
import { LABEL_JENIS, namaTenor } from "@opennael/format";

export const judulPinjaman = (p: {
  pinjamanKe: number;
  jenis: KartuPinjaman["jenis"];
  tenor: number;
}) => `Pinjaman ke-${p.pinjamanKe} · ${LABEL_JENIS[p.jenis]} ${namaTenor(p.jenis, p.tenor)}`;
