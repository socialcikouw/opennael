import type { JenisPinjaman } from "@opennael/domain";
import { memo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { judulKata, MODE } from "@/fitur/tagihan";
import { useGaya, useWarna, useWarnaMode } from "@/komponen/ui/tampilan";
import { HURUF, RUANG, SUDUT, TEBAL, type Warna } from "@/komponen/ui/tema";

/**
 * Satu baris uang di tab pantau (setoran / akad): pita & huruf jenis pinjaman
 * (H/M/T, warna mode jenisnya), nama, nominal, keterangan, dan lencana kecil.
 * Diketuk → rincian pinjaman (hanya-baca) bila `onPress` ada.
 */
export const BarisJenis = memo(function BarisJenis(props: {
  jenis: JenisPinjaman;
  nama: string;
  sub: string;
  nilai: string;
  /** Nominal merah (mis. storting negatif). */
  nilaiBahaya?: boolean;
  lencana?: string | undefined;
  catatan?: string | null | undefined;
  onPress?: (() => void) | undefined;
}) {
  const gaya = useGaya(buatGaya);
  const WARNA = useWarna();
  const w = useWarnaMode(props.jenis);
  const nama = judulKata(props.nama);
  return (
    <Pressable
      accessibilityRole={props.onPress ? "button" : undefined}
      accessibilityLabel={`${nama}, ${MODE[props.jenis].label}, ${props.sub}, ${props.nilai}`}
      disabled={!props.onPress}
      onPress={props.onPress}
      style={({ pressed }) => [gaya.baris, pressed ? gaya.ditekan : null]}
    >
      <View style={[gaya.pita, { backgroundColor: w.teks }]} />
      <View style={[gaya.huruf, { backgroundColor: w.lembut }]}>
        <Text style={[gaya.hurufTeks, { color: w.teks }]}>{MODE[props.jenis].huruf}</Text>
      </View>
      <View style={gaya.tengah}>
        <View style={gaya.deret}>
          <Text style={gaya.nama} numberOfLines={1}>
            {nama}
          </Text>
          <Text
            style={[gaya.nilai, props.nilaiBahaya ? { color: WARNA.bahaya } : null]}
            numberOfLines={1}
          >
            {props.nilai}
          </Text>
        </View>
        <View style={gaya.deret}>
          <Text style={gaya.sub} numberOfLines={1}>
            {props.sub}
          </Text>
          {props.lencana ? (
            <View style={[gaya.lencana, { backgroundColor: w.lembut }]}>
              <Text style={[gaya.lencanaTeks, { color: w.teks }]} numberOfLines={1}>
                {props.lencana}
              </Text>
            </View>
          ) : null}
        </View>
        {props.catatan ? (
          <Text style={gaya.catatan} numberOfLines={2}>
            {props.catatan}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
});

const buatGaya = (WARNA: Warna) =>
  StyleSheet.create({
    baris: {
      flexDirection: "row",
      alignItems: "center",
      gap: RUANG[3],
      marginBottom: RUANG[2],
      paddingVertical: RUANG[3],
      paddingLeft: RUANG[4],
      paddingRight: RUANG[3],
      overflow: "hidden",
      borderRadius: SUDUT.besar,
      borderWidth: 1,
      borderColor: WARNA.garis,
      backgroundColor: WARNA.permukaan,
    },
    ditekan: { opacity: 0.7 },
    pita: { position: "absolute", left: 0, top: 0, bottom: 0, width: 4 },
    huruf: {
      width: 36,
      height: 36,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: SUDUT.bulat,
    },
    hurufTeks: { ...HURUF.sm, fontWeight: TEBAL.ekstra },
    tengah: { flex: 1, gap: RUANG[1] },
    deret: { flexDirection: "row", alignItems: "center", gap: RUANG[2] },
    nama: { ...HURUF.base, flex: 1, fontWeight: TEBAL.tebal, color: WARNA.teks },
    nilai: {
      ...HURUF.sm,
      fontWeight: TEBAL.tebal,
      color: WARNA.teks,
      fontVariant: ["tabular-nums"],
    },
    sub: { ...HURUF.xs, flex: 1, color: WARNA.redup },
    lencana: { paddingHorizontal: RUANG[2], paddingVertical: 2, borderRadius: SUDUT.bulat },
    lencanaTeks: { ...HURUF["2xs"], fontWeight: TEBAL.tebal },
    catatan: { ...HURUF.xs, color: WARNA.teksKedua, fontVariant: ["tabular-nums"] },
  });
