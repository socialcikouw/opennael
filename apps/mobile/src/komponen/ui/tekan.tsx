import type { ComponentProps } from "react";
import { Pressable } from "react-native";
import { getar, type JenisGetar } from "./getar";

export type TekanProps = ComponentProps<typeof Pressable> & {
  /** Getar saat diketuk; bawaan TANPA getar — pasang hanya di momen yang berarti (lihat `getar.ts`). */
  getar?: JenisGetar | false;
};

/**
 * TEKAN — SATU-SATUNYA tombol di aplikasi HP (dijaga `cek:arsitektur`, aturan
 * `pressable-langsung`): `Pressable` + tempat getar. Bawaannya tanpa getar; `getar="…"`
 * bergetar saat ketukan jadi (`onPress`, bukan saat jari menyentuh — menggulir tak
 * bergetar). Tekan lama yang tercapai (`onLongPress`) selalu bergetar `tahan`: itulah
 * satu-satunya tanda bahwa tahan sudah cukup. Tombol mati tak bergetar. Selebihnya sama
 * persis dengan `Pressable`.
 */
export function Tekan({ getar: jenis = false, onPress, onLongPress, ...sisa }: TekanProps) {
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
