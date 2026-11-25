import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { KeyboardStickyView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ikon } from "@/komponen/ui/ikon";
import { GulirKeyboard } from "@/komponen/ui/layar";
import { Tekan } from "@/komponen/ui/tekan";
import { HURUF, RUANG, SUDUT, TEBAL, WARNA } from "@/tema";

/** Bagian kerangka yang sama di semua langkah — disusun `layar-akad.tsx`. */
export interface Kerangka {
  /** "Akad Mingguan". */
  judul: string;
  nomor: number;
  jumlah: number;
  /** Langkah dibuka dari tombol Ubah di Periksa: tombol lanjut kembali ke Periksa. */
  kePeriksa: boolean;
  onMundur: () => void;
  onTutup: () => void;
}

/** Tulisan tombol lanjut: kembali ke Periksa bila langkah ini dibuka dari sana. */
export const judulLanjut = (k: Kerangka, biasa = "Selanjutnya") =>
  k.kePeriksa ? "Kembali ke periksa" : biasa;

/** Tinggi kira-kira kaki bertombol — ruang yang dijaga di atas papan ketik. */
const SENTUH_KAKI = 80;

/**
 * KERANGKA LANGKAH AKAD — satu pertanyaan per layar:
 *   ←   Akad Mingguan   ✕
 *   ▬▬▬▬▬▬░░░░  3 / 8
 *   Siapa nama nasabahnya?        ← `tanya`
 *   Tulis nama lengkap …          ← `sub`
 *   isi (bergulir; isian tak tertutup papan ketik)
 *   kaki (tombol / papan) — ikut naik di atas papan ketik
 * ← = langkah sebelumnya (bukan keluar); ✕ = batalkan akad (ditanya dulu oleh layar).
 */
export function KerangkaLangkah(props: {
  k: Kerangka;
  tanya: string;
  sub?: string;
  children?: ReactNode;
  kaki?: ReactNode;
}) {
  const aman = useSafeAreaInsets();
  const { k } = props;
  return (
    <View style={[gaya.layar, { paddingTop: aman.top + RUANG[2] }]}>
      <View style={gaya.kepala}>
        <TombolBulat ikon="arrow-left" label="Langkah sebelumnya" onPress={k.onMundur} />
        <Text style={gaya.judul} numberOfLines={1}>
          {k.judul}
        </Text>
        <TombolBulat ikon="x" label="Batalkan akad" onPress={k.onTutup} />
      </View>
      <View
        style={gaya.kemajuan}
        accessible
        accessibilityLabel={`Langkah ${k.nomor} dari ${k.jumlah}`}
      >
        <View style={gaya.bilah}>
          <View style={[gaya.bilahIsi, { width: `${(k.nomor / k.jumlah) * 100}%` }]} />
        </View>
        <Text style={gaya.nomor}>
          {k.nomor} / {k.jumlah}
        </Text>
      </View>

      <GulirKeyboard
        style={gaya.gulir}
        contentContainerStyle={gaya.isi}
        bottomOffset={RUANG[10] + SENTUH_KAKI}
        showsVerticalScrollIndicator={false}
      >
        <Text style={gaya.tanya}>{props.tanya}</Text>
        {props.sub ? <Text style={gaya.sub}>{props.sub}</Text> : null}
        {props.children}
      </GulirKeyboard>

      {props.kaki ? (
        <KeyboardStickyView offset={{ closed: 0, opened: aman.bottom }}>
          {props.kaki}
        </KeyboardStickyView>
      ) : null}
    </View>
  );
}

/** Kaki baku: satu (atau dua) tombol di atas garis, aman dari bilah bawah HP. */
export function KakiTombol({ children }: { children: ReactNode }) {
  const bawah = useSafeAreaInsets().bottom;
  return (
    <View style={[gaya.kaki, { paddingBottom: Math.max(bawah, RUANG[3]) + RUANG[1] }]}>
      {children}
    </View>
  );
}

function TombolBulat(props: { ikon: "arrow-left" | "x"; label: string; onPress: () => void }) {
  return (
    <Tekan
      onPress={props.onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={props.label}
      style={({ pressed }) => [gaya.bulat, pressed ? gaya.ditekan : null]}
    >
      <Ikon nama={props.ikon} ukuran={20} warna={WARNA.teksKedua} />
    </Tekan>
  );
}

const gaya = StyleSheet.create({
  layar: { flex: 1, backgroundColor: WARNA.latar },
  kepala: {
    flexDirection: "row",
    alignItems: "center",
    gap: RUANG[2],
    paddingHorizontal: RUANG[3],
  },
  judul: {
    ...HURUF.base,
    flex: 1,
    textAlign: "center",
    fontWeight: TEBAL.ekstra,
    color: WARNA.teks,
  },
  bulat: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: SUDUT.bulat,
    borderWidth: 1,
    borderColor: WARNA.garis,
    backgroundColor: WARNA.permukaan,
  },
  ditekan: { opacity: 0.7, transform: [{ scale: 0.96 }] },
  kemajuan: {
    flexDirection: "row",
    alignItems: "center",
    gap: RUANG[2.5],
    paddingHorizontal: RUANG[4],
    paddingTop: RUANG[3],
  },
  bilah: {
    flex: 1,
    height: 6,
    overflow: "hidden",
    borderRadius: SUDUT.bulat,
    backgroundColor: WARNA.garis,
  },
  bilahIsi: { height: "100%", borderRadius: SUDUT.bulat, backgroundColor: WARNA.utamaIsi },
  nomor: {
    ...HURUF.xs,
    fontWeight: TEBAL.tebal,
    color: WARNA.redup,
    fontVariant: ["tabular-nums"],
  },
  gulir: { flex: 1 },
  isi: {
    flexGrow: 1,
    gap: RUANG[3],
    paddingHorizontal: RUANG[4],
    paddingTop: RUANG[5],
    paddingBottom: RUANG[4],
  },
  tanya: { ...HURUF["2xl"], fontWeight: TEBAL.ekstra, letterSpacing: -0.3, color: WARNA.teks },
  sub: { ...HURUF.sm, marginTop: -RUANG[1.5], color: WARNA.redup },
  kaki: {
    gap: RUANG[2],
    paddingHorizontal: RUANG[4],
    paddingTop: RUANG[2.5],
    borderTopWidth: 1,
    borderTopColor: WARNA.garis,
    backgroundColor: WARNA.latar,
  },
});
