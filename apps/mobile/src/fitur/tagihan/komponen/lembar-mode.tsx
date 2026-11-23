import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { FadeOut, LayoutAnimationConfig, withTiming } from "react-native-reanimated";
import { useHariIni, useTagihan } from "@/fitur/lapangan";
import { LembarBawah } from "@/komponen/lembar-bawah";
import { DURASI, KURVA } from "@/komponen/ui/gerak";
import { Ikon } from "@/komponen/ui/ikon";
import { AKSEN_MODE, HURUF, RUANG, SUDUT, TEBAL, WARNA } from "@/tema";
import { MODE, type ModeApp, ringkasPerMode, URUTAN_MODE, useMode } from "../mode";
import { beralihMode } from "../transisi-mode";

/** Huruf baru meluncur naik ke tempatnya (ease-out); huruf lama memudar cepat. */
function hurufMasuk() {
  "worklet";
  const kurva = { duration: DURASI.kecil, easing: KURVA.keluar };
  return {
    initialValues: { opacity: 0, transform: [{ translateY: 10 }] },
    animations: {
      opacity: withTiming(1, kurva),
      transform: [{ translateY: withTiming(0, kurva) }],
    },
  };
}

/**
 * Huruf mode di lingkaran berwarna mode — (H) (M) (T) (L). Isi tombol kiri batang tab.
 * `bergerak`: huruf berganti dengan gerak saat mode berganti (tombol tab bar); tanpa gerak
 * di daftar lembar Ganti Mode dan saat pertama tampil.
 */
export function HurufMode({
  mode,
  ukuran = 36,
  bergerak = false,
}: {
  mode: ModeApp;
  ukuran?: number;
  bergerak?: boolean;
}) {
  const w = AKSEN_MODE[mode];
  const huruf = <Text style={[gaya.huruf, { color: w.teksIsi }]}>{MODE[mode].huruf}</Text>;
  return (
    <View
      style={[
        gaya.lingkaran,
        { width: ukuran, height: ukuran, borderRadius: ukuran / 2, backgroundColor: w.isi },
      ]}
    >
      {bergerak ? (
        // Huruf lama & baru sempat tampil bersamaan: keduanya ditumpuk (absolut), tak berbaris.
        <LayoutAnimationConfig skipEntering>
          <Animated.View
            key={mode}
            entering={hurufMasuk}
            exiting={FadeOut.duration(DURASI.keluar)}
            style={gaya.tumpuk}
          >
            {huruf}
          </Animated.View>
        </LayoutAnimationConfig>
      ) : (
        huruf
      )}
    </View>
  );
}

/**
 * Lembar GANTI MODE — dibuka tombol huruf mode di kiri batang tab. Tiap baris:
 * huruf, nama, keterangan, dan "n nasabah · m perlu ditagih hari ini".
 */
export function LembarMode({ terbuka, onTutup }: { terbuka: boolean; onTutup: () => void }) {
  const mode = useMode();
  const tagihan = useTagihan();
  const hariIni = useHariIni();
  const tanggal = hariIni.data?.kalender.tanggal;
  const ringkas = useMemo(
    () => (tagihan.data && tanggal ? ringkasPerMode(tagihan.data, tanggal) : null),
    [tagihan.data, tanggal],
  );

  const pilih = (m: ModeApp) => {
    onTutup();
    beralihMode(m);
  };

  return (
    <LembarBawah terbuka={terbuka} onTutup={onTutup} judul="Ganti Mode">
      {URUTAN_MODE.map((m) => (
        <BarisMode key={m} mode={m} aktif={m === mode} ringkas={ringkas?.[m]} onPilih={pilih} />
      ))}
      <Text style={gaya.catatan}>
        Absen dan laporan tetap satu untuk semua mode. Laporan baru bisa dibuka setelah semua
        tagihan wajib hari ini — harian dan mingguan — dicatat.
      </Text>
    </LembarBawah>
  );
}

function BarisMode(props: {
  mode: ModeApp;
  aktif: boolean;
  ringkas: { aktif: number; tagih: number } | undefined;
  onPilih: (m: ModeApp) => void;
}) {
  const w = AKSEN_MODE[props.mode];
  return (
    <Pressable
      onPress={() => props.onPilih(props.mode)}
      accessibilityRole="button"
      accessibilityState={{ selected: props.aktif }}
      style={({ pressed }) => [
        gaya.baris,
        props.aktif ? { borderColor: w.teks, backgroundColor: w.lembut } : null,
        pressed ? gaya.ditekan : null,
      ]}
    >
      <HurufMode mode={props.mode} ukuran={44} />
      <View style={gaya.tengah}>
        <Text style={gaya.judul}>{MODE[props.mode].label}</Text>
        <Text style={gaya.keterangan}>{MODE[props.mode].keterangan}</Text>
        <Text style={[gaya.angka, { color: w.teks }]}>
          {props.ringkas
            ? `${props.ringkas.aktif} nasabah · ${props.ringkas.tagih} perlu ditagih hari ini`
            : "Memuat…"}
        </Text>
      </View>
      <Ikon
        nama={props.aktif ? "circle-check" : "chevron-right"}
        ukuran={20}
        warna={props.aktif ? w.teks : WARNA.samar}
      />
    </Pressable>
  );
}

const gaya = StyleSheet.create({
  lingkaran: { alignItems: "center", justifyContent: "center", overflow: "hidden" },
  tumpuk: { ...StyleSheet.absoluteFill, alignItems: "center", justifyContent: "center" },
  huruf: { ...HURUF.lg, fontWeight: TEBAL.ekstra, includeFontPadding: false },
  baris: {
    flexDirection: "row",
    alignItems: "center",
    gap: RUANG[3],
    padding: RUANG[3],
    borderRadius: SUDUT.besar,
    borderWidth: 1.5,
    borderColor: WARNA.garis,
  },
  ditekan: { opacity: 0.7 },
  tengah: { flex: 1, gap: RUANG[0.5] },
  judul: { ...HURUF.base, fontWeight: TEBAL.tebal, color: WARNA.teks },
  keterangan: { ...HURUF.xs, color: WARNA.redup },
  angka: { ...HURUF.xs, fontWeight: TEBAL.semi },
  catatan: { ...HURUF.xs, color: WARNA.redup, textAlign: "center" },
});
