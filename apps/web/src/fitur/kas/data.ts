import { type DataKueri, kunci } from "@opennael/api-client";
import { useQueryClient } from "@tanstack/react-query";
import type { kueri } from "@/lib/api";

/** Awalan kunci yang disegarkan sesudah membatalkan catatan kas. */
export const KUNCI_KAS = [kunci.kas];

export function useSegarkanKas() {
  const klien = useQueryClient();
  return () => {
    for (const k of [kunci.kas, kunci.aktivitas]) void klien.invalidateQueries({ queryKey: k });
  };
}

export type Pencocokan = DataKueri<ReturnType<typeof kueri.kas.pencocokan>>[number];

// ---- layar --------------------------------------------------------------------------

export type Gerakan = DataKueri<ReturnType<typeof kueri.kas.laporan>>["gerakan"][number];
