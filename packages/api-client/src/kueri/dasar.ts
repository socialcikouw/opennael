import type { DataTag } from "@tanstack/react-query";

/** Tipe isi jawaban sebuah kueri: `DataKueri<ReturnType<typeof kueri.kas.laporan>>`. */
export type DataKueri<O> = O extends { queryKey: DataTag<infer _K, infer D, infer _E> } ? D : never;
