import type { DataKueri } from "@opennael/api-client";
import type { kueri } from "@/lib/api";

export type Karyawan = DataKueri<ReturnType<typeof kueri.pengguna.semua>>[number];

export type Aksi = {
  jenis: "sunting" | "nonaktifkan" | "aktifkan" | "perangkat";
  orang: Karyawan;
} | null;

// ---- perangkat ----------------------------------------------------------------------

export type Perangkat = DataKueri<ReturnType<typeof kueri.perangkat.daftar>>[number];
