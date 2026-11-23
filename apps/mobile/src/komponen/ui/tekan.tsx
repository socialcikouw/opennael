import type { ComponentProps } from "react";
import { Pressable } from "react-native";
import { getar, type JenisGetar } from "./getar";

export type TekanProps = ComponentProps<typeof Pressable> & {
  /** Getar saat diketuk (bawaan `ketuk`); `false` = tanpa getar (mis. latar penutup lembar). */
  getar?: JenisGetar | false;
};

/**
 * TEKAN — `Pressable` yang selalu bergetar: SATU-SATUNYA tombol di aplikasi HP (dijaga
 * `cek:arsitektur`, aturan `pressable-langsung`). Getar `getar` saat ketukan jadi (`onPress`,
 * bukan saat jari menyentuh — supaya menggulir daftar tak bergetar), dan getar `tahan` saat
 * tekan lama tercapai (`onLongPress`). Tombol mati (`disabled`) tak bergetar karena
 * `onPress` tak dipanggil. Selebihnya sama persis dengan `Pressable`.
 */
export function Tekan({ getar: jenis = "ketuk", onPress, onLongPress, ...sisa }: TekanProps) {
  return (
    <Pressable
      {...sisa}
      onPress={
        onPress
          ? (e) => {
              if (jenis) getar(jenis);
              onPress(e);
            }
          : undefined
      }
      onLongPress={
        onLongPress
          ? (e) => {
              getar("tahan");
              onLongPress(e);
            }
          : undefined
      }
    />
  );
}
