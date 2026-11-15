import { useEffect, useState } from "react";
import { cariAlamat } from "@/platform/lokasi";
import { type RincianAlamat, susunAlamat } from "./inti/titik-rumah";

/** Alamat per titik (dibulatkan ±10 m) — titik rumah tak pernah pindah, jadi cukup dicari sekali per HP menyala. */
const ingatan = new Map<string, RincianAlamat>();
const berjalan = new Map<string, Promise<RincianAlamat | null>>();

const kunciTitik = (latitude: number, longitude: number) =>
  `${latitude.toFixed(4)},${longitude.toFixed(4)}`;

/** Satu pencarian per titik, dibagi ke semua pemanggil; hanya hasil yang berhasil diingat. */
function carikan(latitude: number, longitude: number): Promise<RincianAlamat | null> {
  const kunci = kunciTitik(latitude, longitude);
  const ada = berjalan.get(kunci);
  if (ada) return ada;
  const baru = cariAlamat(latitude, longitude)
    .then((alamat) => {
      const rincian = susunAlamat(alamat);
      if (rincian) ingatan.set(kunci, rincian);
      return rincian;
    })
    .catch(() => null)
    .finally(() => berjalan.delete(kunci));
  berjalan.set(kunci, baru);
  return baru;
}

/** Keadaan pencarian alamat: sedang dicari, atau selesai (`alamat` null = gagal / tak ada titik). */
export interface HasilAlamat {
  memuat: boolean;
  alamat: RincianAlamat | null;
}

const TANPA_TITIK: HasilAlamat = { memuat: false, alamat: null };

/**
 * ALAMAT dari titik rumah (geokode terbalik HP): nama desa untuk keterangan foto dan
 * alamat bertingkat untuk kartu Titik Rumah. Tak pernah galat — tanpa sinyal atau tanpa
 * layanan geokode HP, hasilnya `alamat: null` dan tampilan cukup menyembunyikannya.
 */
export function useAlamatTitik(titik: { latitude: number; longitude: number } | null): HasilAlamat {
  const latitude = titik?.latitude;
  const longitude = titik?.longitude;
  const [hasil, setHasil] = useState<HasilAlamat>(() => {
    if (latitude === undefined || longitude === undefined) return TANPA_TITIK;
    const diingat = ingatan.get(kunciTitik(latitude, longitude));
    return diingat ? { memuat: false, alamat: diingat } : { memuat: true, alamat: null };
  });

  useEffect(() => {
    if (latitude === undefined || longitude === undefined) {
      setHasil(TANPA_TITIK);
      return;
    }
    const diingat = ingatan.get(kunciTitik(latitude, longitude));
    if (diingat) {
      setHasil({ memuat: false, alamat: diingat });
      return;
    }
    let batal = false;
    setHasil({ memuat: true, alamat: null });
    void carikan(latitude, longitude).then((alamat) => {
      if (!batal) setHasil({ memuat: false, alamat });
    });
    return () => {
      batal = true;
    };
  }, [latitude, longitude]);

  return hasil;
}
