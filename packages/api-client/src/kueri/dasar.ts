import type { DataTag } from "@tanstack/react-query";
import type { Klien } from "../klien";
import type { buatPanggil } from "../panggil";

export type Ambil = ReturnType<typeof buatPanggil>["ambil"];

/** Bahan kueri: klien RPC aplikasi dan `ambil` (galat server/jaringan → `Error` berpesan). */
export interface Bahan {
  api: Klien;
  ambil: Ambil;
}

/** Tipe isi jawaban sebuah kueri: `DataKueri<ReturnType<typeof kueri.kas.laporan>>`. */
export type DataKueri<O> = O extends { queryKey: DataTag<infer _K, infer D, infer _E> } ? D : never;
