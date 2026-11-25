import { useCallback, useMemo, useState } from "react";
import { LayoutAnimation } from "react-native";
import { type Baris, lipatKelompok, type SegmenTagihan } from "./inti/daftar";

/**
 * Lipat / buka kelompok kampung di daftar. Kuncinya per segmen (kampung yang
 * sama di Berjalan dan Macet dilipat sendiri-sendiri). Selama mencari, semua
 * kelompok terbuka supaya hasil pencarian tak tersembunyi.
 */
export function useLipatKelompok(baris: Baris[], segmen: SegmenTagihan, mencari: boolean) {
  const [terlipat, setTerlipat] = useState<ReadonlySet<string>>(new Set());
  const tampil = useMemo(() => {
    if (mencari) return baris;
    const idSegmen = new Set<string>();
    for (const b of baris)
      if (b.jenis === "judul" && terlipat.has(`${segmen}|${b.id}`)) idSegmen.add(b.id);
    return lipatKelompok(baris, idSegmen);
  }, [baris, terlipat, segmen, mencari]);

  const ubah = useCallback(
    (id: string) => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setTerlipat((lama) => {
        const baru = new Set(lama);
        const kunci = `${segmen}|${id}`;
        if (baru.has(kunci)) baru.delete(kunci);
        else baru.add(kunci);
        return baru;
      });
    },
    [segmen],
  );

  return { tampil, ubah };
}
