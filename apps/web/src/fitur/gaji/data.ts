import { ambil, api } from "@/lib/api";

export const ambilPratinjau = (kolektorId: string, mulai: string, selesai: string) =>
  ambil(() => api.penggajian.kas.gaji.pratinjau.$get({ query: { kolektorId, mulai, selesai } }));

export type Pratinjau = Awaited<ReturnType<typeof ambilPratinjau>>;

export type HariGaji = Pratinjau["hari"][number];

export const ambilSlip = (kolektorId?: string) =>
  ambil(() => api.penggajian.kas.gaji.$get({ query: kolektorId ? { kolektorId } : {} }));

export type Slip = Awaited<ReturnType<typeof ambilSlip>>[number];
