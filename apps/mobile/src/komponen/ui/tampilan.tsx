import * as SecureStore from "expo-secure-store";
import { createContext, type ReactNode, useContext, useMemo, useSyncExternalStore } from "react";
import { useColorScheme } from "react-native";
import { GELAP, MODE_GELAP, MODE_TERANG, TEBAL, TERANG, type Warna, type WarnaMode } from "./tema";

/**
 * MODE TAMPILAN — terang / gelap. Bawaan mengikuti HP; pengguna boleh memilih
 * sendiri (disimpan di HP ini). APK yang `userInterfaceStyle`-nya masih
 * `light` (`app.config.ts`) selalu melaporkan terang, jadi di sana "Ikuti HP"
 * = terang dan mode gelap hanya lewat pilihan manual.
 */
export type PilihanTampilan = "sistem" | "terang" | "gelap";

const KUNCI = "opennael.tampilan";
let pilihan: PilihanTampilan = "sistem";
const pendengar = new Set<() => void>();

export const tampilan = {
  ambil: () => pilihan,

  /** Dibaca sekali saat aplikasi menyala; sebelum selesai = "sistem". */
  async muat(): Promise<void> {
    try {
      const nilai = await SecureStore.getItemAsync(KUNCI);
      if (nilai === "terang" || nilai === "gelap") {
        pilihan = nilai;
        for (const p of pendengar) p();
      }
    } catch {
      // Brankas tak terbaca: tetap mengikuti HP.
    }
  },

  async pilih(baru: PilihanTampilan): Promise<void> {
    pilihan = baru;
    for (const p of pendengar) p();
    await SecureStore.setItemAsync(KUNCI, baru);
  },

  dengar(p: () => void) {
    pendengar.add(p);
    return () => {
      pendengar.delete(p);
    };
  },
};

export function usePilihanTampilan(): PilihanTampilan {
  return useSyncExternalStore(tampilan.dengar, tampilan.ambil);
}

const KonteksWarna = createContext<Warna>(TERANG);

/** Pasang sekali di akar aplikasi. */
export function PenyediaTampilan({ children }: { children: ReactNode }) {
  const pilih = usePilihanTampilan();
  const sistem = useColorScheme();
  const gelap = pilih === "gelap" || (pilih === "sistem" && sistem === "dark");
  return <KonteksWarna.Provider value={gelap ? GELAP : TERANG}>{children}</KonteksWarna.Provider>;
}

/** Palet warna mode yang sedang berlaku. */
export function useWarna(): Warna {
  return useContext(KonteksWarna);
}

export function useGelap(): boolean {
  return useWarna() === GELAP;
}

/** Gaya hasil `buat(palet)`, dibuat sekali per palet dan dipakai bersama semua komponen. */
const simpananGaya = new WeakMap<object, Map<Warna, unknown>>();

export function useGaya<T>(buat: (w: Warna) => T): T {
  const w = useWarna();
  return useMemo(() => {
    let perPalet = simpananGaya.get(buat);
    if (!perPalet) {
      perPalet = new Map();
      simpananGaya.set(buat, perPalet);
    }
    if (!perPalet.has(w)) perPalet.set(w, buat(w));
    return perPalet.get(w) as T;
  }, [buat, w]);
}

/** Warna mode aplikasi kolektor (Harian/Mingguan/Tempoan/Semua) di tema yang berlaku. */
export function useWarnaMode(mode: keyof typeof MODE_TERANG): WarnaMode {
  return (useGelap() ? MODE_GELAP : MODE_TERANG)[mode];
}

const buatOpsiStack = (WARNA: Warna) =>
  ({
    headerTintColor: WARNA.utama,
    headerTitleStyle: { color: WARNA.teks, fontWeight: TEBAL.tebal },
    headerStyle: { backgroundColor: WARNA.latar },
    headerShadowVisible: false,
    headerBackButtonDisplayMode: "minimal",
    contentStyle: { backgroundColor: WARNA.latar },
  }) as const;

/** Header Stack baku layar-layar peran (kolektor, kasir, pengawas), sesuai mode tampilan. */
export function useOpsiStack() {
  return useGaya(buatOpsiStack);
}
