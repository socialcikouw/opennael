import { type ReactNode, useRef } from "react";
import { StyleSheet, Text } from "react-native";
import ReanimatedSwipeable, {
  type SwipeableMethods,
} from "react-native-gesture-handler/ReanimatedSwipeable";
import type { NamaIkon } from "@/komponen/ui/daftar-ikon";
import { getar } from "@/komponen/ui/getar";
import { Ikon } from "@/komponen/ui/ikon";
import { Tekan } from "@/komponen/ui/tekan";
import { HURUF, RUANG, SUDUT, TEBAL, WARNA } from "@/tema";

/** Lebar tombol aksi di belakang kartu (pt). */
const LEBAR_AKSI = 96;

/** Kartu yang sedang terbuka — hanya satu sekaligus (dibuka kartu lain / digulir = ditutup). */
let terbuka: SwipeableMethods | null = null;

/** Tutup kartu yang sedang tergeser (dipanggil saat daftar mulai digulir). */
export function tutupGeser() {
  terbuka?.close();
  terbuka = null;
}

/**
 * GESER KARTU KE KIRI → TOMBOL AKSI di belakang kartu (keputusan pemilik 28 Nov 2026):
 *   - harian & mingguan: LUNASI merah + sisa saldo (menggantikan tahan lama kartu);
 *   - tempoan sejak jatuh tempo: JANJI BESOK amber (tombol LUNASI tetap di kartu); bila janji
 *     sudah habis tombolnya abu dan ketukan menampilkan alasannya.
 * Ketuk tombol = aksi kartu seperti biasa (konfirmasi tetap ditanya); kartu menutup lagi. Geser
 * ke kiri (bukan kanan): sisi kiri kartu adalah rel kampung, dan usapan dari tepi kiri Android
 * = "kembali". Kartu baru ikut bergerak sesudah jari bergeser 24 pt; getar halus saat terbuka;
 * hanya satu kartu terbuka sekaligus.
 */
export function GeserKartu(props: {
  judul: string;
  /** Baris kecil di bawah judul (mis. sisa saldo); null = tanpa. */
  keterangan: string | null;
  ikon: NamaIkon;
  /** Latar tombol (tulisan putih). */
  latar: string;
  aksesLabel: string;
  onPress: () => void;
  children: ReactNode;
}) {
  const ref = useRef<SwipeableMethods>(null);
  return (
    <ReanimatedSwipeable
      ref={ref}
      friction={1.5}
      rightThreshold={LEBAR_AKSI / 2}
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
          accessibilityLabel={props.aksesLabel}
          onPress={() => {
            ref.current?.close();
            props.onPress();
          }}
          style={({ pressed }) => [
            gaya.aksi,
            { backgroundColor: props.latar },
            pressed ? gaya.ditekan : null,
          ]}
        >
          <Ikon nama={props.ikon} ukuran={20} warna={WARNA.teksAtasBahaya} />
          <Text style={gaya.judul} numberOfLines={2}>
            {props.judul}
          </Text>
          {props.keterangan ? (
            <Text style={gaya.saldo} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
              {props.keterangan}
            </Text>
          ) : null}
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
  aksi: {
    width: LEBAR_AKSI,
    alignItems: "center",
    justifyContent: "center",
    gap: RUANG[0.5],
    paddingHorizontal: RUANG[1],
  },
  ditekan: { opacity: 0.85 },
  judul: {
    ...HURUF.xs,
    textAlign: "center",
    fontWeight: TEBAL.ekstra,
    letterSpacing: 0.5,
    color: WARNA.teksAtasBahaya,
  },
  saldo: {
    ...HURUF["3xs"],
    maxWidth: LEBAR_AKSI - RUANG[2],
    fontWeight: TEBAL.semi,
    color: WARNA.teksAtasBahaya,
    fontVariant: ["tabular-nums"],
  },
});
