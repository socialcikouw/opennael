import {
  buatSesi,
  type PenyimpanSesi,
  type Sesi,
  useSesi as useSesiDasar,
} from "@opennael/api-client";

/**
 * SESI BOS di browser — `localStorage` supaya bos tetap masuk sesudah browser
 * ditutup. Token segar per perangkat bisa dicabut bos (keluar / putus
 * perangkat), dan token akses hanya berumur 15 menit.
 */
export type { Sesi };

const KUNCI = "nael.sesi.bos";

function baca(): Sesi | null {
  try {
    const teks = localStorage.getItem(KUNCI);
    return teks ? (JSON.parse(teks) as Sesi) : null;
  } catch {
    return null;
  }
}

const penyimpan: PenyimpanSesi = {
  bacaSinkron: baca,
  tulis(sesi) {
    if (sesi) localStorage.setItem(KUNCI, JSON.stringify(sesi));
    else localStorage.removeItem(KUNCI);
  },
  // Keluar / masuk di tab lain ikut terbaca di tab ini.
  pantau(sesudahBerubah) {
    const dengar = (e: StorageEvent) => {
      if (e.key === KUNCI) sesudahBerubah(baca());
    };
    window.addEventListener("storage", dengar);
    return () => window.removeEventListener("storage", dengar);
  },
};

/** Toko sesi mentah (dipakai transport). */
export const tokoSesi = buatSesi(penyimpan);

/** Sesi untuk kode web: selalu terbaca sinkron (`null` = belum masuk). */
export const sesi = {
  ...tokoSesi,
  ambil: (): Sesi | null => tokoSesi.ambil() ?? null,
};

export function useSesi(): Sesi | null {
  return useSesiDasar(tokoSesi) ?? null;
}
