import { ambil, api } from "@/lib/api";

export const ambilPerKolektor = (t: string) =>
  ambil(() => api.pelaporan.ringkasan["per-kolektor"].$get({ query: { mulai: t, selesai: t } }));

export type PerKolektor = Awaited<ReturnType<typeof ambilPerKolektor>>[number];
