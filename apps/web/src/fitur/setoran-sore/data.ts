import { ambil, api } from "@/lib/api";

export const KUNCI_HARIAN = [["harian"]];

// ---- setoran nasabah ----------------------------------------------------------------

export const ambilTransaksi = (tanggal: string, kolektorId?: string) =>
  ambil(() =>
    api.hariKolektor.transaksi.$get({ query: { tanggal, ...(kolektorId ? { kolektorId } : {}) } }),
  );

export type Transaksi = Awaited<ReturnType<typeof ambilTransaksi>>[number];

// ---- transfer -----------------------------------------------------------------------

export const ambilTransfer = (tanggal: string) =>
  ambil(() => api.hariKolektor["transfer-setoran"].$get({ query: { tanggal } }));

export type Transfer = Awaited<ReturnType<typeof ambilTransfer>>["transfer"][number];

// ---- libur nasabah ------------------------------------------------------------------

export const ambilLibur = async (tanggal: string) =>
  (await ambil(() => api.pembiayaan.transaksi.peristiwa.$get({ query: { tanggal } }))).filter(
    (p) => p.kategori === "libur",
  );

export type Libur = Awaited<ReturnType<typeof ambilLibur>>[number];

// ---- biaya tak terduga --------------------------------------------------------------

export const ambilBiaya = (tanggal: string) =>
  ambil(() =>
    api.hariKolektor["biaya-tak-terduga"].$get({
      query: { tanggalMulai: tanggal, tanggalSelesai: tanggal, termasukBatal: "ya" },
    }),
  );

export type Biaya = Awaited<ReturnType<typeof ambilBiaya>>["biaya"][number];
