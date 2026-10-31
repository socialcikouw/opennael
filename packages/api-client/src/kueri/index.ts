import type { Bahan } from "../bahan";
import { kueriHariKolektor } from "./hari-kolektor";
import { kueriIdentitas } from "./identitas";
import { kueriKantor } from "./kantor";
import { kueriKas } from "./kas";
import { kueriLapangan } from "./lapangan";
import { kueriPelaporan } from "./pelaporan";
import { kueriPembiayaan } from "./pembiayaan";
import { kueriPenggajian } from "./penggajian";
import { kueriSetoran } from "./setoran";

export type { DataKueri } from "./dasar";

/**
 * KATALOG KUERI — semua bacaan API sebagai `queryOptions` (kunci + fungsi +
 * opsi bawaan), satu per bacaan, dikelompokkan menurut konteks API. Layar
 * memakainya langsung (`useQuery(kueri.pengguna.kolektor())`) dan menimpa
 * hanya yang khas layar (`placeholderData`, `select`); tidak ada array kunci
 * literal di layar. Kunci berawalan `kunci` (lihat `kunci.ts`).
 */
export function buatKueri(bahan: Bahan) {
  return {
    ...kueriHariKolektor(bahan),
    ...kueriIdentitas(bahan),
    ...kueriKantor(bahan),
    ...kueriKas(bahan),
    ...kueriLapangan(bahan),
    ...kueriPelaporan(bahan),
    ...kueriPembiayaan(bahan),
    ...kueriPenggajian(bahan),
    ...kueriSetoran(bahan),
  };
}

export type Kueri = ReturnType<typeof buatKueri>;
