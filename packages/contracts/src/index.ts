/**
 * Bentuk permintaan & respons API OpenNael (Zod). Rute Hono di
 * `apps/api` memakai skema ini — tidak mendefinisikan ulang — dan formulir di
 * `apps/mobile` / `apps/web` memvalidasi dengan skema yang sama. Folder
 * mengikuti konteks modul API; pemakai cukup mengimpor dari paket ini.
 */
export * from "./bersama/galat";
export * from "./bersama/idempotensi";
export * from "./bersama/param";
export * from "./bersama/sehat";
export * from "./hari-kolektor/absensi";
export * from "./hari-kolektor/rute-kolektor";
export * from "./hari-kolektor/setoran-sore";
export * from "./identitas/auth";
export * from "./identitas/pengguna";
export * from "./identitas/perangkat";
export * from "./identitas/tautan";
export * from "./kantor/kalender";
export * from "./kantor/kebijakan";
export * from "./kantor/profil";
export * from "./kantor/wilayah";
export * from "./kas";
export * from "./migrasi";
export * from "./pelaporan/aktivitas";
export * from "./pelaporan/ringkasan";
export * from "./pembiayaan/akad";
export * from "./pembiayaan/foto";
export * from "./pembiayaan/nasabah";
export * from "./pembiayaan/pembatalan";
export * from "./pembiayaan/pemutihan";
export * from "./pembiayaan/peristiwa";
export * from "./pembiayaan/pinjaman";
export * from "./pembiayaan/tabungan";
export * from "./penggajian/gaji";
export * from "./penggajian/tarif";
