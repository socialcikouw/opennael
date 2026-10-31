import { StyleSheet, Text, View } from "react-native";
import { Ikon } from "@/komponen/ui/ikon";
import { useGaya, useWarna } from "@/komponen/ui/tampilan";
import { HURUF, RUANG, SUDUT, TEBAL, type Warna, type WarnaMode } from "@/komponen/ui/tema";
import type { KartuVM, Nada } from "../inti/kartu";

/** Garis rel dari lingkaran ke kartu. */
const GARIS = 2;
/** Garis tengah lingkaran angsuran ke- (pt). */
const BULAT = 30;
/** Celah antara lingkaran dan kartu. */
const CELAH = RUANG[2];
/** Lebar lajur kiri (lingkaran + celah): kartu mulai sesudahnya, rel masuk ke tepinya. */
export const LEBAR_REL = BULAT + CELAH;
/**
 * Tinggi siku rel: dari bawah lingkaran ke tengah baris pertama kartu
 * (garis kartu 1 + isian RUANG[3] + setengah baris 20).
 */
const TINGGI_SIKU = 1 + RUANG[3] + 10;

export function useNada(): Record<Nada, { teks: string; latar: string }> {
  const WARNA = useWarna();
  return {
    merah: { teks: WARNA.bahayaTeks, latar: WARNA.bahayaLembut },
    hijau: { teks: WARNA.utama, latar: WARNA.utamaLembut },
    kuning: { teks: WARNA.waspada, latar: WARNA.waspadaLembut },
    abu: { teks: WARNA.teksKedua, latar: WARNA.abu },
  };
}

/**
 * Kepala kartu, di luar kotak: lingkaran angsuran ke- (mis. "12"), nama, lalu
 * di ujung kanan lencana status (Macet · Baru · Gulung …) dan hari tagih
 * mingguan. Rel ke kartu digambar oleh `SikuRel`.
 */
export function KepalaKartu({ vm, aksen }: { vm: KartuVM; aksen: WarnaMode }) {
  const gaya = useGaya(buatGaya);
  const nada = useNada();
  return (
    <View style={gaya.kepala}>
      <View
        accessible
        accessibilityLabel={`Angsuran ke-${vm.p.angsuranKe}`}
        style={[gaya.lingkaran, { backgroundColor: aksen.lembut }]}
      >
        <Text
          style={[gaya.lingkaranTeks, { color: aksen.teks }]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.7}
        >
          {vm.angsuranKeTeks}
        </Text>
      </View>
      <Text style={gaya.nama} numberOfLines={1}>
        {vm.namaJudul}
      </Text>
      {vm.hariTagih ? <LencanaHari hari={vm.hariTagih} aksen={aksen} /> : null}
      {vm.lencana ? (
        <View style={[gaya.lencana, { backgroundColor: nada[vm.lencana.nada].latar }]}>
          <Ikon nama={vm.lencana.ikon} ukuran={11} warna={nada[vm.lencana.nada].teks} />
          <Text style={[gaya.lencanaTeks, { color: nada[vm.lencana.nada].teks }]}>
            {vm.lencana.teks}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

/**
 * Siku rel: garis dari bawah lingkaran turun lalu membelok masuk ke tepi kiri
 * kartu di baris pertamanya. Ditaruh di wadah kartu (berisi `paddingLeft:
 * LEBAR_REL`), di belakang kartu.
 */
export function SikuRel() {
  const gaya = useGaya(buatGaya);
  return <View pointerEvents="none" style={gaya.siku} />;
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

const buatGaya = (WARNA: Warna) =>
  StyleSheet.create({
    kepala: { flexDirection: "row", alignItems: "center", gap: CELAH },
    lingkaran: {
      width: BULAT,
      height: BULAT,
      borderRadius: SUDUT.bulat,
      alignItems: "center",
      justifyContent: "center",
    },
    lingkaranTeks: {
      ...HURUF.sm,
      fontWeight: TEBAL.ekstra,
      fontVariant: ["tabular-nums"],
    },
    nama: { ...HURUF.base, flex: 1, fontWeight: TEBAL.tebal, color: WARNA.teks },
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
    siku: {
      position: "absolute",
      top: 0,
      left: BULAT / 2 - GARIS / 2,
      width: LEBAR_REL - (BULAT / 2 - GARIS / 2),
      height: TINGGI_SIKU,
      borderLeftWidth: GARIS,
      borderBottomWidth: GARIS,
      borderBottomLeftRadius: SUDUT.kecil,
      borderColor: WARNA.garisTegas,
    },
  });
