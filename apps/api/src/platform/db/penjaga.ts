/**
 * Penjaga database pengembangan. Skrip yang menulis atau menghapus isi
 * database (seed, reset, data uji, uji yang menyentuh database) WAJIB
 * memanggil ini lebih dulu: produksi tidak pernah disentuh dari mesin
 * pengembang.
 */
export function pastikanDatabasePengembangan(databaseUrl: string | undefined): void {
  let host: string;
  try {
    host = new URL(databaseUrl ?? "").hostname;
  } catch {
    throw new Error("DATABASE_URL tidak sah — skrip pengembangan dihentikan");
  }
  if (!host.endsWith(".supabase.com")) {
    throw new Error(
      `DATABASE_URL menunjuk ${host}, bukan Supabase pengembangan — skrip ini hanya boleh berjalan ke *.supabase.com`,
    );
  }
}
