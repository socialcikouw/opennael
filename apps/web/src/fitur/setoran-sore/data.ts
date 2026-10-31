import { type DataKueri, kunci } from "@opennael/api-client";
import type { kueri } from "@/lib/api";

/** Awalan kunci yang disegarkan sesudah membatalkan catatan setoran sore. */
export const KUNCI_HARIAN = [kunci.harian];

// ---- setoran nasabah ----------------------------------------------------------------

export type Transaksi = DataKueri<ReturnType<typeof kueri.harian.transaksi>>[number];

// ---- transfer -----------------------------------------------------------------------

export type Transfer = DataKueri<ReturnType<typeof kueri.harian.transfer>>["transfer"][number];

// ---- libur nasabah ------------------------------------------------------------------

export type Libur = DataKueri<ReturnType<typeof kueri.harian.libur>>[number];

// ---- biaya tak terduga --------------------------------------------------------------

export type Biaya = DataKueri<ReturnType<typeof kueri.harian.biaya>>["biaya"][number];
