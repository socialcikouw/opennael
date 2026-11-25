import { StyleSheet, Text, View } from "react-native";
import { LembarBawah } from "@/komponen/lembar-bawah";
import { Ikon } from "@/komponen/ui/ikon";
import { Tekan } from "@/komponen/ui/tekan";
import { AKSEN, HURUF, RUANG, SUDUT, TEBAL, WARNA } from "@/tema";
import { MODE, type Mode, URUTAN_MODE, useMode } from "../mode";
import { beralihMode } from "../transisi-mode";
import { HurufMode } from "./huruf-mode";

/**
 * Lembar GANTI MODE — dibuka tombol huruf mode di kiri tab bar. HANYA tiga pilihan (koreksi
 * pemilik 26 Nov 2026): Mode Kerja, Mode Rekap, Mode Akun — tiap baris: huruf, nama,
 * keterangan, dan tab-tab mode itu. Profil & pengaturan ada di Mode Akun, bukan di sini.
 */
export function LembarMode({ terbuka, onTutup }: { terbuka: boolean; onTutup: () => void }) {
  const mode = useMode();
  const pilih = (m: Mode) => {
    onTutup();
    beralihMode(m);
  };
  return (
    <LembarBawah terbuka={terbuka} onTutup={onTutup} judul="Ganti Mode">
      {URUTAN_MODE.map((m) => (
        <BarisMode key={m} mode={m} aktif={m === mode} onPilih={pilih} />
      ))}
    </LembarBawah>
  );
}

function BarisMode(props: { mode: Mode; aktif: boolean; onPilih: (m: Mode) => void }) {
  const w = AKSEN;
  return (
    <Tekan
      getar="pilih"
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
        <Text style={gaya.judul}>Mode {MODE[props.mode].label}</Text>
        <Text style={gaya.keterangan}>{MODE[props.mode].keterangan}</Text>
        <Text style={[gaya.tab, { color: w.teks }]}>{MODE[props.mode].tab}</Text>
      </View>
      <Ikon
        nama={props.aktif ? "circle-check" : "chevron-right"}
        ukuran={20}
        warna={props.aktif ? w.teks : WARNA.samar}
      />
    </Tekan>
  );
}

const gaya = StyleSheet.create({
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
  tab: { ...HURUF.xs, fontWeight: TEBAL.semi },
});
