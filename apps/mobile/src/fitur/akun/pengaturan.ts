import { useState } from "react";
import { aturGetar, getar, getarNyala } from "@/komponen/ui/getar";
import { pengaturanHp } from "@/platform/brankas";

/** Muat pengaturan HP ini sekali saat aplikasi dibuka (`app/_layout.tsx`). */
export async function muatPengaturanHp() {
  const g = await pengaturanHp.bacaGetar().catch(() => null);
  if (g !== null) aturGetar(g);
}

/** Sakelar Getar di Pengaturan: berlaku seketika untuk seluruh aplikasi, disimpan di HP. */
export function useGetar() {
  const [nyala, setNyala] = useState(getarNyala);
  const ubah = (baru: boolean) => {
    aturGetar(baru);
    setNyala(baru);
    // Menyalakan = langsung terasa contohnya (satu getar halus).
    if (baru) getar("pilih");
    void pengaturanHp.simpanGetar(baru).catch(() => undefined);
  };
  return { nyala, ubah };
}
