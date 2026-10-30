export type Akun = "tunai" | "bank";

export type JenisMutasi =
  | "setor_modal"
  | "tarik_modal"
  | "biaya_kantor"
  | "pindah_akun"
  | "lain_masuk"
  | "lain_keluar";

export const LABEL_MUTASI: Record<JenisMutasi, string> = {
  setor_modal: "Setor modal",
  tarik_modal: "Tarik modal",
  biaya_kantor: "Biaya kantor",
  pindah_akun: "Pindah akun",
  lain_masuk: "Pemasukan lain",
  lain_keluar: "Pengeluaran lain",
};
