import { ambil, api } from "@/lib/api";

export const ambilPengguna = () =>
  ambil(() => api.identitas.pengguna.$get({ query: { termasukNonaktif: "ya" } }));

export type Karyawan = Awaited<ReturnType<typeof ambilPengguna>>[number];

export type Aksi = {
  jenis: "sunting" | "nonaktifkan" | "aktifkan" | "perangkat";
  orang: Karyawan;
} | null;

// ---- perangkat ----------------------------------------------------------------------

export const ambilPerangkat = (riwayat: boolean) =>
  ambil(() =>
    api.identitas.auth.perangkat.$get({ query: riwayat ? { termasukDiputus: "true" } : {} }),
  );

export type Perangkat = Awaited<ReturnType<typeof ambilPerangkat>>[number];
