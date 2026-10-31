/**
 * AWALAN KUNCI KUERI — satu-satunya tempat nama kelompok kueri ditulis.
 * Kunci tiap kueri (`kueri/*.ts`) dimulai dari awalan di sini, jadi
 * `invalidateQueries({ queryKey: kunci.pengguna })` menyegarkan semua kueri
 * kelompok itu, di layar mana pun ia dipakai. Awalan baru ditambahkan di sini,
 * bukan diketik sebagai array di layar.
 */
export const kunci = {
  aktivitas: ["aktivitas"],
  gaji: ["gaji"],
  harian: ["harian"],
  kampung: ["kampung"],
  kantor: ["kantor"],
  kas: ["kas"],
  kebijakan: ["kebijakan"],
  /** HP kolektor: semua kueri alur lapangan (hari ini, tagihan, kalender, …). */
  lapangan: ["lapangan"],
  liburKantor: ["libur-kantor"],
  nasabah: ["nasabah"],
  pengguna: ["pengguna"],
  perangkat: ["perangkat"],
  pinjaman: ["pinjaman"],
  riwayat: ["riwayat"],
  ringkasan: ["ringkasan"],
  ruteKolektor: ["rute-kolektor"],
  /** HP kasir & pengawas: hari kolektor, setoran, biaya. */
  setoran: ["setoran"],
  tarifGaji: ["tarif-gaji"],
  wilayah: ["wilayah"],
} as const;
