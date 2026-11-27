import { rupiah } from "@opennael/format";
import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { useGajiBerjalan } from "@/fitur/gaji";
import { LembarBawah } from "@/komponen/lembar-bawah";
import type { NamaIkon } from "@/komponen/ui/daftar-ikon";
import { Ikon } from "@/komponen/ui/ikon";
import { Tekan } from "@/komponen/ui/tekan";
import { AKSEN, HURUF, RUANG, SUDUT, TEBAL, WARNA } from "@/tema";

/**
 * LEMBAR MENU Mode Rekap (opsi C, keputusan pemilik 28 Nov 2026) — dibuka tombol kanan tab
 * bar Rekap. Ubin layar-layar yang jarang dibuka (tab tetap untuk yang harian: Ringkasan,
 * Performa, Portofolio); ubin boleh membawa angka kecil supaya menu ikut jadi layar pantau.
 * Mengetuk ubin menutup lembar lalu membuka layarnya. Isi lembar baru dipasang saat terbuka
 * (Modal), jadi bacaan ubin tak berjalan selama lembar tertutup.
 */
export function LembarMenu({ terbuka, onTutup }: { terbuka: boolean; onTutup: () => void }) {
  const buka = (rute: "/kolektor/gaji" | "/kolektor/foto-nasabah") => {
    onTutup();
    router.push(rute);
  };
  return (
    <LembarBawah terbuka={terbuka} onTutup={onTutup} judul="Menu">
      <View style={gaya.grid}>
        <UbinGaji onPress={() => buka("/kolektor/gaji")} />
        <Ubin
          ikon="images"
          judul="Foto Nasabah"
          ket="Foto serah terima per kampung"
          onPress={() => buka("/kolektor/foto-nasabah")}
        />
      </View>
    </LembarBawah>
  );
}

/** Ubin Gaji membawa gaji yang belum dibayar (perkiraan). */
function UbinGaji({ onPress }: { onPress: () => void }) {
  const { pratinjau } = useGajiBerjalan();
  const nilai = pratinjau.data?.gajiBersih;
  return (
    <Ubin
      ikon="hand-coins"
      judul="Gaji"
      ket={nilai === undefined ? "Slip & gaji berjalan" : `${rupiah(nilai)} belum dibayar`}
      onPress={onPress}
    />
  );
}

function Ubin(props: { ikon: NamaIkon; judul: string; ket: string; onPress: () => void }) {
  return (
    <Tekan
      accessibilityRole="button"
      accessibilityLabel={`${props.judul}, ${props.ket}`}
      onPress={props.onPress}
      style={({ pressed }) => [gaya.ubin, pressed ? gaya.ditekan : null]}
    >
      <View style={[gaya.ikon, { backgroundColor: AKSEN.lembut }]}>
        <Ikon nama={props.ikon} ukuran={20} warna={AKSEN.teks} />
      </View>
      <Text style={gaya.judul}>{props.judul}</Text>
      <Text style={gaya.ket} numberOfLines={2}>
        {props.ket}
      </Text>
    </Tekan>
  );
}

const gaya = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: RUANG[3] },
  ubin: {
    flexBasis: "47%",
    flexGrow: 1,
    gap: RUANG[1.5],
    padding: RUANG[3],
    borderRadius: SUDUT.besar,
    borderWidth: 1,
    borderColor: WARNA.garis,
    backgroundColor: WARNA.permukaan,
  },
  ditekan: { opacity: 0.7 },
  ikon: {
    width: 40,
    height: 40,
    borderRadius: SUDUT.sedang,
    alignItems: "center",
    justifyContent: "center",
  },
  judul: { ...HURUF.base, fontWeight: TEBAL.tebal, color: WARNA.teks },
  ket: { ...HURUF.xs, color: WARNA.redup, fontVariant: ["tabular-nums"] },
});
