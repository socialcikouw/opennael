import { type DataKueri, kunci } from "@opennael/api-client";
import { useQueryClient } from "@tanstack/react-query";
import type { kueri } from "@/lib/api";

// ---- kampung ------------------------------------------------------------------------

export type Kampung = DataKueri<ReturnType<typeof kueri.wilayah.daftar>>[number];

/** Segarkan semua yang memuat nama kampung. */
export function useSegarkanKampung() {
  const klien = useQueryClient();
  return () => {
    for (const k of [kunci.wilayah, kunci.nasabah, kunci.ruteKolektor]) {
      void klien.invalidateQueries({ queryKey: k });
    }
  };
}
