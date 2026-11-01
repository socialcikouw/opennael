import { useCallback, useState } from "react";

/**
 * Pemutar `RefreshControl` yang hanya menyala karena ditarik tangan — bukan karena
 * penyegaran di latar (`isRefetching` ikut benar sesudah tiap transaksi atau saat
 * layar lain memasang kueri yang sama, lalu pemutar muncul sendiri di puncak daftar).
 */
export function useTarikSegarkan(segarkan: () => Promise<unknown>) {
  const [aktif, setAktif] = useState(false);
  const tarik = useCallback(() => {
    setAktif(true);
    void segarkan().finally(() => setAktif(false));
  }, [segarkan]);
  return { aktif, tarik };
}
