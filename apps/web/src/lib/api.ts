import { buatKlien, buatPanggil, buatTransport } from "@opennael/api-client";
import { tokoSesi } from "./sesi";

/** API di asal yang sama (`/api`, diteruskan Vite saat pengembangan / Nginx di produksi). */
const ALAMAT_API = `${window.location.origin}/api`;

/** `fetch` bersesi: token akses disisipkan, kedaluwarsa → refresh sekali lalu ulangi. */
const ambilDenganSesi = buatTransport({ alamat: ALAMAT_API, sesi: tokoSesi });

/** Klien RPC bertipe per konteks — bentuk permintaan & jawaban mengikuti rute di `apps/api`. */
export const api = buatKlien(ALAMAT_API, ambilDenganSesi);

export const { panggil, ambil, PESAN_JARINGAN } = buatPanggil({
  pesanJaringan: "Server tidak terjangkau — periksa koneksi",
  rincian: true,
});
