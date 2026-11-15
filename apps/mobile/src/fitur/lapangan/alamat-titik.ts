import { useEffect, useState } from "react";
import { cariAlamat } from "@/platform/lokasi";
import { susunAlamat } from "./inti/titik-rumah";

/** Alamat per titik (dibulatkan ±10 m) — titik rumah tak pernah pindah, jadi cukup dicari sekali per HP menyala. */
const ingatan = new Map<string, string[]>();
const berjalan = new Map<string, Promise<string[] | null>>();

const kunciTitik = (latitude: number, longitude: number) =>
  `${latitude.toFixed(4)},${longitude.toFixed(4)}`;

/** Satu pencarian per titik, dibagi ke semua pemanggil; hanya hasil yang berhasil diingat. */
function carikan(latitude: number, longitude: number): Promise<string[] | null> {
  const kunci = kunciTitik(latitude, longitude);
  const ada = berjalan.get(kunci);
  if (ada) return ada;
  const baru = cariAlamat(latitude, longitude)
    .then((alamat) => {
      const baris = susunAlamat(alamat);
      if (baris) ingatan.set(kunci, baris);
      return baris;
    })
    .catch(() => null)
    .finally(() => berjalan.delete(kunci));
  berjalan.set(kunci, baru);
  return baru;
}

/**
 * ALAMAT dari titik rumah (geokode terbalik HP), satu baris per tingkat — ditempel di
 * foto serah terima. `null` selama dicari, bila nasabah belum punya titik, atau bila
 * pencarian gagal (tanpa sinyal / tanpa layanan geokode HP): foto cukup tampil tanpa
 * alamat, tak pernah galat.
 */
export function useAlamatTitik(
  titik: { latitude: number; longitude: number } | null,
): string[] | null {
  const latitude = titik?.latitude;
  const longitude = titik?.longitude;
  const [baris, setBaris] = useState<string[] | null>(() =>
    latitude === undefined || longitude === undefined
      ? null
      : (ingatan.get(kunciTitik(latitude, longitude)) ?? null),
  );

  useEffect(() => {
    if (latitude === undefined || longitude === undefined) {
      setBaris(null);
      return;
    }
    const diingat = ingatan.get(kunciTitik(latitude, longitude));
    if (diingat) {
      setBaris(diingat);
      return;
    }
    let batal = false;
    void carikan(latitude, longitude).then((hasil) => {
      if (!batal) setBaris(hasil);
    });
    return () => {
      batal = true;
    };
  }, [latitude, longitude]);

  return baris;
}
