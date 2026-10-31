import { StyleSheet, Text, View } from "react-native";
import { Ikon } from "@/komponen/ui/ikon";
import { useGaya, useWarna } from "@/komponen/ui/tampilan";
import { HURUF, RUANG, SUDUT, TEBAL, type Warna, type WarnaMode } from "@/komponen/ui/tema";
import type { KartuVM, Nada } from "../inti/kartu";

function useNada(): Record<Nada, { teks: string; latar: string }> {
  const WARNA = useWarna();
  return {
    merah: { teks: WARNA.bahayaTeks, latar: WARNA.bahayaLembut },
    hijau: { teks: WARNA.utama, latar: WARNA.utamaLembut },
    kuning: { teks: WARNA.waspada, latar: WARNA.waspadaLembut },
    abu: { teks: WARNA.teksKedua, latar: WARNA.abu },
  };
}

/** Lencana status nasabah: Macet · Baru · Gulung naik/tetap/turun. */
export function LencanaStatus({ lencana }: { lencana: NonNullable<KartuVM["lencana"]> }) {
  const gaya = useGaya(buatGaya);
  const nada = useNada()[lencana.nada];
  return (
    <View style={[gaya.lencana, { backgroundColor: nada.latar }]}>
      <Ikon nama={lencana.ikon} ukuran={11} warna={nada.teks} />
      <Text style={[gaya.lencanaTeks, { color: nada.teks }]}>{lencana.teks}</Text>
    </View>
  );
}

/** Lencana PEKAT hari tagih mingguan, mis. [📅 Rabu] — beda bentuk dari lencana status. */
export function LencanaHari({ hari, aksen }: { hari: string; aksen: WarnaMode }) {
  const gaya = useGaya(buatGaya);
  return (
    <View
      accessible
      accessibilityLabel={`Ditagih tiap ${hari}`}
      style={[gaya.hari, { backgroundColor: aksen.isi }]}
    >
      <Ikon nama="calendar" ukuran={11} warna={aksen.teksIsi} />
      <Text style={[gaya.lencanaTeks, { color: aksen.teksIsi }]}>{hari}</Text>
    </View>
  );
}

const buatGaya = (_WARNA: Warna) =>
  StyleSheet.create({
    lencana: {
      flexDirection: "row",
      alignItems: "center",
      gap: RUANG[1],
      paddingHorizontal: RUANG[2],
      paddingVertical: 2,
      borderRadius: SUDUT.bulat,
    },
    hari: {
      flexDirection: "row",
      alignItems: "center",
      gap: RUANG[1],
      paddingHorizontal: RUANG[1.5],
      paddingVertical: 2,
      borderRadius: SUDUT.kecil - 2,
    },
    lencanaTeks: { ...HURUF["2xs"], fontWeight: TEBAL.tebal },
  });
