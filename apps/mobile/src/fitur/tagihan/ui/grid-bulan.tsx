import { memo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useGaya, useWarna } from "@/komponen/tampilan";
import { HURUF, RUANG, SUDUT, TEBAL, type Warna } from "@/komponen/tema";
import { type BarisPekan, type KategoriSel, LABEL_HARI, type Sel } from "../inti/grid";

/**
 * Grid setoran sebulan — satu nampan abu: judul hari, lalu pekan-pekan bulan
 * ini (pekan berjalan menjadi pita yang timbul, sel hari ini pil berwarna
 * mode). Sel berupa TEKS tanpa latar: yang normal (setoran) netral, warna
 * disisakan untuk yang menyimpang — libur merah, terlewat abu, gulung &
 * lunas berwarna mode.
 */
export const GridBulan = memo(function GridBulan(props: {
  pekan: readonly BarisPekan[];
  kolomHariIni: number;
  /** Warna mode — judul & pil hari ini, sel gulung/lunas. */
  aksen: { teks: string; lembut: string };
}) {
  const gaya = useGaya(buatGaya);
  return (
    <View style={gaya.nampan}>
      <View style={gaya.baris}>
        <Text style={[gaya.nomor, gaya.judul]}>M</Text>
        {LABEL_HARI.map((hari, i) => (
          <Text
            key={hari}
            style={[
              gaya.judul,
              gaya.kolom,
              i === props.kolomHariIni ? { color: props.aksen.teks } : null,
            ]}
          >
            {hari}
          </Text>
        ))}
      </View>
      {props.pekan.map((baris) => (
        <View key={baris.nomor} style={[gaya.baris, baris.berjalan ? gaya.barisBerjalan : null]}>
          <Text style={[gaya.nomor, baris.berjalan ? gaya.nomorBerjalan : null]}>
            {baris.nomor}
          </Text>
          {baris.sel.map((sel, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: kolom tetap Senin–Sabtu
            <SelGrid key={i} sel={sel} aksen={props.aksen} />
          ))}
        </View>
      ))}
    </View>
  );
});

function SelGrid({ sel, aksen }: { sel: Sel; aksen: { teks: string; lembut: string } }) {
  const WARNA = useWarna();
  const gaya = useGaya(buatGaya);
  if (sel.teks === "" && !sel.hariIni) return <View style={gaya.kolom} />;
  const warna: Record<KategoriSel, string> = {
    bayar: WARNA.teks,
    libur: WARNA.bahaya,
    gulung: aksen.teks,
    lunas: aksen.teks,
    liburKantor: WARNA.samar,
    bolos: WARNA.samar,
    hampa: "transparent",
  };
  return (
    <View style={gaya.kolom}>
      <Text
        numberOfLines={1}
        style={[
          gaya.nilai,
          { color: warna[sel.kategori] },
          sel.hariIni ? [gaya.pil, { backgroundColor: aksen.lembut }] : null,
        ]}
      >
        {sel.teks}
      </Text>
    </View>
  );
}

const buatGaya = (WARNA: Warna) =>
  StyleSheet.create({
    nampan: { padding: RUANG[1.5], borderRadius: SUDUT.besar, backgroundColor: WARNA.abu },
    baris: {
      flexDirection: "row",
      alignItems: "center",
      height: 24,
      paddingHorizontal: RUANG[1],
      borderRadius: SUDUT.kecil,
    },
    barisBerjalan: { backgroundColor: WARNA.permukaan },
    judul: {
      ...HURUF["3xs"],
      fontWeight: TEBAL.tebal,
      letterSpacing: 0.4,
      textTransform: "uppercase",
      textAlign: "center",
      color: WARNA.samar,
    },
    nomor: {
      ...HURUF["2xs"],
      width: 18,
      fontWeight: TEBAL.semi,
      textAlign: "center",
      color: WARNA.samar,
      fontVariant: ["tabular-nums"],
    },
    nomorBerjalan: { color: WARNA.teksKedua },
    kolom: { flex: 1, alignItems: "center" },
    nilai: {
      ...HURUF["2xs"],
      fontWeight: TEBAL.semi,
      textAlign: "center",
      fontVariant: ["tabular-nums"],
    },
    pil: {
      minWidth: 34,
      paddingHorizontal: RUANG[1.5],
      paddingVertical: 1,
      borderRadius: SUDUT.bulat,
      overflow: "hidden",
    },
  });
