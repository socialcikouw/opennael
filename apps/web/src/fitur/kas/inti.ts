export type Akun = "tunai" | "bank";

export type JenisMutasi =
  | "setor_modal"
  | "tarik_modal"
  | "biaya_kantor"
  | "pindah_akun"
  | "lain_masuk"
  | "lain_keluar";

export const LABEL_MUTASI: Record<JenisMutasi, string> = {
  setor_modal: "Setor Modal",
  tarik_modal: "Tarik Modal",
  biaya_kantor: "Biaya Kantor",
  pindah_akun: "Pindah Akun",
  lain_masuk: "Pemasukan Lain",
  lain_keluar: "Pengeluaran Lain",
};
