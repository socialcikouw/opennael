import {
  buatKlien,
  buatPanggil,
  buatPenyimpanKunci,
  buatTransport,
  type MediumKunci,
} from "@opennael/api-client";
import { tokoSesi } from "./sesi";

/** API di asal yang sama (`/api`, diteruskan Vite saat pengembangan / Nginx di produksi). */
const ALAMAT_API = `${window.location.origin}/api`;

const KUNCI_TERTUNDA = "nael.kunci-tertunda";

/**
 * Kunci idempoten yang belum mendapat jawaban pasti bertahan di `localStorage`:
 * halaman dimuat ulang sesudah koneksi putus, ketukan ulang tetap memakai kunci
 * yang sama (server tidak mencatat dua kali). `localStorage` boleh gagal
 * (mode privat, penuh) — penyimpan menelan galatnya.
 */
const mediumKunci: MediumKunci = {
  baca: () => localStorage.getItem(KUNCI_TERTUNDA),
  tulis: (teks) => {
    if (teks) localStorage.setItem(KUNCI_TERTUNDA, teks);
    else localStorage.removeItem(KUNCI_TERTUNDA);
  },
};

/**
 * `fetch` bersesi: token akses disisipkan, kedaluwarsa → refresh sekali lalu ulangi;
 * operasi tulis idempoten diberi `Idempotency-Key` dan diulang otomatis bila hasilnya tak pasti.
 */
const ambilDenganSesi = buatTransport({
  alamat: ALAMAT_API,
  sesi: tokoSesi,
  idempoten: { penyimpan: buatPenyimpanKunci(mediumKunci) },
});

/** Klien RPC bertipe per konteks — bentuk permintaan & jawaban mengikuti rute di `apps/api`. */
export const api = buatKlien(ALAMAT_API, ambilDenganSesi);

export const { panggil, ambil, PESAN_JARINGAN } = buatPanggil({
  pesanJaringan: "Server tidak terjangkau — periksa koneksi",
  rincian: true,
});
