import { StyleSheet, Text, View } from "react-native";
import { Ikon } from "@/komponen/ui/ikon";
import { HURUF, RUANG, SUDUT, TEBAL, WARNA, type WarnaAksen } from "@/tema";
import type { KartuVM, Nada } from "../inti/kartu";

const NADA: Record<Nada, { teks: string; latar: string }> = {
  merah: { teks: WARNA.bahayaTeks, latar: WARNA.bahayaLembut },
  hijau: { teks: WARNA.sukses, latar: WARNA.suksesLembut },
  kuning: { teks: WARNA.waspada, latar: WARNA.waspadaLembut },
  abu: { teks: WARNA.teksKedua, latar: WARNA.isiNetral },
};

/** Lencana asal kartu droping: Baru · Gulung Naik/Tetap/Turun (macet tak berlencana — ada segmen Macet). */
export function LencanaStatus({ lencana }: { lencana: NonNullable<KartuVM["lencana"]> }) {
  const nada = NADA[lencana.nada];
  return (
    <View style={[gaya.lencana, { backgroundColor: nada.latar }]}>
      <Ikon nama={lencana.ikon} ukuran={11} warna={nada.teks} />
      <Text style={[gaya.lencanaTeks, { color: nada.teks }]}>{lencana.teks}</Text>
    </View>
  );
}

/**
 * Lencana TONAL hari tagih mingguan, mis. [📅 Rabu] — latar terakota sangat muda, tulisan &
 * ikon terakota tua, garis tepi tipis (28 Nov 2026; dulu coral pekat). Kalem & jelas: satu-
 * satunya isi pekat di kartu tetap lingkaran angsuran ke-. Kontras utama/utamaLembut diuji.
 */
export function LencanaHari({
  hari,
  aksen,
  kecil = false,
}: {
  hari: string;
  aksen: WarnaAksen;
  /** Sebaris dengan tanggal akad 10 pt di kartu tagih: lebih pendek. */
  kecil?: boolean;
}) {
  return (
    <View
      accessible
      accessibilityLabel={`Ditagih tiap ${hari}`}
      style={[gaya.hari, kecil ? gaya.hariKecil : null, { backgroundColor: aksen.lembut }]}
    >
      <Ikon nama="calendar" ukuran={kecil ? 10 : 11} warna={aksen.teks} />
      <Text style={[kecil ? gaya.teksKecil : gaya.lencanaTeks, { color: aksen.teks }]}>{hari}</Text>
    </View>
  );
}

const gaya = StyleSheet.create({
  lencana: {
    flexDirection: "row",
    alignItems: "center",
    gap: RUANG[1],
    paddingHorizontal: RUANG[2],
    paddingVertical: 2,
    borderRadius: SUDUT.bulat,
  },
  hari: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: WARNA.utamaGaris,
    flexDirection: "row",
    alignItems: "center",
    gap: RUANG[1],
    paddingHorizontal: RUANG[1.5],
    paddingVertical: 2,
    borderRadius: SUDUT.kecil - 2,
  },
  lencanaTeks: { ...HURUF["2xs"], fontWeight: TEBAL.tebal },
  hariKecil: { paddingHorizontal: RUANG[1], paddingVertical: 1 },
  teksKecil: { ...HURUF["3xs"], fontWeight: TEBAL.tebal },
});
