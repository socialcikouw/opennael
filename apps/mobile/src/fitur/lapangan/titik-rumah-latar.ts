import { useEffect, useState } from "react";
import { pantauPosisi } from "@/platform/lokasi";
import { AKURASI_CUKUP_METER, pilihTitikTerbaik, type TitikRumah } from "./inti/titik-rumah";

/** Keadaan pemantau GPS latar: masih mencari titik, sudah ada titik sah, atau tak bisa (izin/GPS). */
export type TitikLatar =
  | { status: "mencari" }
  | { status: "siap"; titik: TitikRumah }
  | { status: "tak-ada"; alasan: string };

/**
 * TITIK RUMAH DI LATAR — dari layar dipasang sampai dilepas, GPS HP dipantau tanpa
 * mengganggu kolektor (memotret, mengisi formulir). Yang disimpan titik paling akurat
 * sejauh ini; GPS yang baru menyala kasar dulu lalu makin akurat. Pemantau berhenti
 * sendiri begitu akurasi cukup (`AKURASI_CUKUP_METER`) dan saat layar dilepas. Tak
 * pernah melempar galat — GPS hanya tambahan, tak boleh menghalangi pekerjaan utama.
 */
export function useTitikRumahLatar(): TitikLatar {
  const [hasil, setHasil] = useState<TitikLatar>({ status: "mencari" });

  useEffect(() => {
    let tutup = false;
    let berhenti: (() => void) | null = null;
    let terbaik: TitikRumah | null = null;
    const hentikan = () => {
      tutup = true;
      berhenti?.();
      berhenti = null;
    };

    pantauPosisi((posisi) => {
      if (tutup) return;
      const baru = pilihTitikTerbaik(terbaik, posisi);
      if (!baru || baru === terbaik) return;
      terbaik = baru;
      setHasil({ status: "siap", titik: baru });
      if (baru.akurasiMeter <= AKURASI_CUKUP_METER) hentikan();
    }).then(
      (henti) => {
        if (tutup) henti();
        else berhenti = henti;
      },
      (e: unknown) => {
        if (!tutup) {
          setHasil({
            status: "tak-ada",
            alasan: e instanceof Error ? e.message : "GPS tidak tersedia.",
          });
        }
      },
    );

    return hentikan;
  }, []);

  return hasil;
}
