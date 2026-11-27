import { type ReactNode, useRef } from "react";
import { StyleSheet, Text } from "react-native";
import ReanimatedSwipeable, {
  type SwipeableMethods,
} from "react-native-gesture-handler/ReanimatedSwipeable";
import { getar } from "@/komponen/ui/getar";
import { Ikon } from "@/komponen/ui/ikon";
import { Tekan } from "@/komponen/ui/tekan";
import { HURUF, RUANG, SUDUT, TEBAL, WARNA } from "@/tema";

/** Lebar tombol LUNASI di belakang kartu (pt). */
const LEBAR_LUNASI = 96;

/** Kartu yang sedang terbuka — hanya satu sekaligus (dibuka kartu lain / digulir = ditutup). */
let terbuka: SwipeableMethods | null = null;

/** Tutup kartu yang sedang tergeser (dipanggil saat daftar mulai digulir). */
export function tutupGeser() {
  terbuka?.close();
  terbuka = null;
}

/**
 * GESER UNTUK LUNASI (kartu harian & mingguan; keputusan pemilik 28 Nov 2026, menggantikan
 * tahan lama kartu): geser kartu ke KIRI → tombol LUNASI merah muncul di belakang kartu,
 * di sisi kanan, bertuliskan sisa saldo. Ketuk tombol = konfirmasi Lunasi seperti biasa
 * (`onLunasi`); kartu menutup lagi. Geser ke kiri (bukan kanan): sisi kiri kartu adalah rel
 * kampung, dan usapan dari tepi kiri Android = "kembali". Kartu baru ikut bergerak sesudah
 * jari bergeser 24 pt (bukan saat menggulir miring); getar halus saat tombol terbuka.
 */
export function GeserLunasi(props: { saldoRp: string; onLunasi: () => void; children: ReactNode }) {
  const ref = useRef<SwipeableMethods>(null);
  return (
    <ReanimatedSwipeable
      ref={ref}
      friction={1.5}
      rightThreshold={LEBAR_LUNASI / 2}
      dragOffsetFromRight={-24}
      overshootRight={false}
      containerStyle={gaya.wadah}
      onSwipeableWillOpen={() => {
        if (terbuka && terbuka !== ref.current) terbuka.close();
        terbuka = ref.current;
        getar("pilih");
      }}
      onSwipeableClose={() => {
        if (terbuka === ref.current) terbuka = null;
      }}
      renderRightActions={() => (
        <Tekan
          accessibilityRole="button"
          accessibilityLabel={`Lunasi, sisa saldo ${props.saldoRp}`}
          onPress={() => {
            ref.current?.close();
            props.onLunasi();
          }}
          style={({ pressed }) => [gaya.lunasi, pressed ? gaya.ditekan : null]}
        >
          <Ikon nama="check-check" ukuran={20} warna={WARNA.teksAtasBahaya} />
          <Text style={gaya.judul}>LUNASI</Text>
          <Text style={gaya.saldo} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
            {props.saldoRp}
          </Text>
        </Tekan>
      )}
    >
      {props.children}
    </ReanimatedSwipeable>
  );
}

const gaya = StyleSheet.create({
  // Sudut sama dengan kotak kartu supaya tombol di belakangnya tak mencuat.
  wadah: { borderRadius: SUDUT.besar, overflow: "hidden" },
  lunasi: {
    width: LEBAR_LUNASI,
    alignItems: "center",
    justifyContent: "center",
    gap: RUANG[0.5],
    backgroundColor: WARNA.bahayaBingkai,
  },
  ditekan: { opacity: 0.85 },
  judul: { ...HURUF.xs, fontWeight: TEBAL.ekstra, letterSpacing: 0.5, color: WARNA.teksAtasBahaya },
  saldo: {
    ...HURUF["3xs"],
    maxWidth: LEBAR_LUNASI - RUANG[2],
    fontWeight: TEBAL.semi,
    color: WARNA.teksAtasBahaya,
    fontVariant: ["tabular-nums"],
  },
});
