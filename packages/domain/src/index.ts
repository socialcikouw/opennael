/**
 * Aturan usaha murni OpenNael — tanpa database, HTTP, atau jam sistem.
 * Dipakai `apps/api` (sumber kebenaran) dan aplikasi klien (pratinjau angka
 * yang sama persis). Diisi per modul: kalender kantor, rumus akad, jadwal
 * tagih, aturan macet, rumus kas — lihat `docs/skema/`.
 */

export * from "./akad";
export * from "./gaji";
export * from "./galat";
export * from "./gulung";
export * from "./kalender";
export * from "./kas";
export * from "./kode-tautan";
export * from "./libur";
export * from "./macet";
export * from "./nik";
export * from "./nomor-hp";
export * from "./performa";
export * from "./setoran";
export * from "./tabungan";
export * from "./tagih";
export * from "./wilayah";
