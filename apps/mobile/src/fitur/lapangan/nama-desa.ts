import { useEffect, useState } from "react";
import { cariAlamat } from "@/platform/lokasi";
import { pilihNamaDesa } from "./inti/titik-rumah";

/** Nama desa per titik (dibulatkan ±10 m) — titik rumah tak pernah pindah, jadi cukup dicari sekali per HP menyala. */
const ingatan = new Map<string, string>();
const berjalan = new Map<string, Promise<string | null>>();

const kunciTitik = (latitude: number, longitude: number) =>
  `${latitude.toFixed(4)},${longitude.toFixed(4)}`;

/** Satu pencarian per titik, dibagi ke semua pemanggil; hanya hasil yang berhasil diingat. */
function carikan(latitude: number, longitude: number): Promise<string | null> {
  const kunci = kunciTitik(latitude, longitude);
  const ada = berjalan.get(kunci);
  if (ada) return ada;
  const baru = cariAlamat(latitude, longitude)
    .then((alamat) => {
      const nama = pilihNamaDesa(alamat);
      if (nama) ingatan.set(kunci, nama);
      return nama;
    })
    .catch(() => null)
    .finally(() => berjalan.delete(kunci));
  berjalan.set(kunci, baru);
  return baru;
}

/**
 * NAMA DESA dari titik rumah (geokode terbalik HP) untuk keterangan di foto: `null`
 * selama dicari, bila nasabah belum punya titik, atau bila pencarian gagal (tanpa
 * sinyal / layanan HP tak ada) — keterangan cukup tak tampil, tak pernah galat.
 */
export function useNamaDesa(titik: { latitude: number; longitude: number } | null): string | null {
  const latitude = titik?.latitude;
  const longitude = titik?.longitude;
  const [nama, setNama] = useState<string | null>(() =>
    latitude === undefined || longitude === undefined
      ? null
      : (ingatan.get(kunciTitik(latitude, longitude)) ?? null),
  );

  useEffect(() => {
    if (latitude === undefined || longitude === undefined) {
      setNama(null);
      return;
    }
    const diingat = ingatan.get(kunciTitik(latitude, longitude));
    if (diingat) {
      setNama(diingat);
      return;
    }
    let batal = false;
    void carikan(latitude, longitude).then((hasil) => {
      if (!batal) setNama(hasil);
    });
    return () => {
      batal = true;
    };
  }, [latitude, longitude]);

  return nama;
}
