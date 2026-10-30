import { useQueryClient } from "@tanstack/react-query";
import { ambil, api } from "@/lib/api";

export const KUNCI_KAS = [["kas"]];

export function useSegarkanKas() {
  const klien = useQueryClient();
  return () => {
    for (const k of [["kas"], ["aktivitas"]]) void klien.invalidateQueries({ queryKey: k });
  };
}

export const ambilPencocokan = (mulai: string, selesai: string) =>
  ambil(() => api.kas.kas.pencocokan.$get({ query: { mulai, selesai } }));

export type Pencocokan = Awaited<ReturnType<typeof ambilPencocokan>>[number];

// ---- layar --------------------------------------------------------------------------

export const ambilLaporan = (mulai: string, selesai: string) =>
  ambil(() => api.kas.kas.laporan.$get({ query: { mulai, selesai } }));

export type Gerakan = Awaited<ReturnType<typeof ambilLaporan>>["gerakan"][number];
