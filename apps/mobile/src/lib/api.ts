import { buatKlien, buatPanggil, buatTransport } from "@opennael/api-client";
import { sesi } from "./sesi";

/** Alamat API — `EXPO_PUBLIC_API_URL` di `apps/mobile/.env` (IP laptop, bukan localhost). */
export const ALAMAT_API = process.env.EXPO_PUBLIC_API_URL ?? "";

/**
 * `fetch` bersesi: token akses disisipkan; kedaluwarsa (15 menit) → tukar token
 * segar sekali, lalu ulangi permintaan.
 */
export const ambilDenganSesi = buatTransport({ alamat: ALAMAT_API, sesi });

/** Klien RPC bertipe per konteks — bentuk permintaan & jawaban mengikuti rute di `apps/api`. */
export const api = buatKlien(ALAMAT_API, ambilDenganSesi);

export const { panggil, bacaGalat, PESAN_JARINGAN } = buatPanggil({
  pesanJaringan: "Server tidak terjangkau — periksa sinyal atau alamat API",
});
