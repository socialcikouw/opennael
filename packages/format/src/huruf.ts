/**
 * HURUF BESAR-KECIL TAMPILAN — satu aturan untuk web & HP (docs/tampilan.md).
 * Data teks isian sudah disimpan huruf kecil (konvensi skema #10); pembantu ini
 * memastikan rupanya tetap seragam di layar mana pun.
 *
 *   nama orang & kantor  → huruf kecil         budi santoso
 *   alamat / kampung     → HURUF BESAR         PULE BARAT
 *   keterangan / alasan  → huruf kecil         ganti ban dalam
 *   judul                → Kapital Tiap Kata   Bayar Angsuran
 */

/** Nama orang & kantor: huruf kecil. */
export const tampilNama = (nama: string): string => nama.trim().toLocaleLowerCase("id-ID");

/** Alamat / kampung: HURUF BESAR. */
export const tampilKampung = (kampung: string): string => kampung.trim().toLocaleUpperCase("id-ID");

/** Keterangan, alasan, caption: huruf kecil. */
export const tampilKeterangan = (teks: string): string => teks.trim().toLocaleLowerCase("id-ID");

/**
 * Judul layar/kartu/dialog/pemberitahuan: Kapital Tiap Kata. Hanya huruf
 * pertama tiap kata yang dibesarkan — sisanya apa adanya, jadi singkatan &
 * merek tetap utuh ("OpenNael", "Rp", "RT 03"). Nama orang tak dimasukkan ke
 * sini; rangkai sesudahnya: `${judul("libur")} — ${tampilNama(nama)}`.
 */
export function judul(teks: string): string {
  return teks.replace(
    /(^|[\s(/·—-])(\p{L})/gu,
    (_, awal: string, huruf: string) => `${awal}${huruf.toLocaleUpperCase("id-ID")}`,
  );
}
