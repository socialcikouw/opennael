import type { Klien } from "./klien";
import type { buatPanggil } from "./panggil";

export type Ambil = ReturnType<typeof buatPanggil>["ambil"];

/** Bahan katalog kueri & tulisan: klien RPC aplikasi dan `ambil` (galat server/jaringan → `Error` berpesan). */
export interface Bahan {
  api: Klien;
  ambil: Ambil;
}
