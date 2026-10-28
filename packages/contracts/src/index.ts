/**
 * Bentuk permintaan & respons API OpenNael (Zod). Rute Hono di
 * `apps/api` memakai skema ini — tidak mendefinisikan ulang — dan formulir di
 * `apps/mobile` / `apps/web` memvalidasi dengan skema yang sama.
 */
export * from "./aktivitas";
export * from "./auth";
export * from "./foto";
export * from "./gaji";
export * from "./galat";
export * from "./idempotensi";
export * from "./kas";
export * from "./lapangan";
export * from "./migrasi";
export * from "./nasabah";
export * from "./pembatalan";
export * from "./pemutihan";
export * from "./pengaturan";
export * from "./pengguna";
export * from "./perangkat";
export * from "./peristiwa";
export * from "./pinjaman";
export * from "./ringkasan";
export * from "./rute";
export * from "./sehat";
export * from "./setoran-sore";
export * from "./tabungan";
export * from "./tautan";
export * from "./wilayah";
